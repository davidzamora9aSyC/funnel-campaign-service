import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CommunicationClient } from '../integrations/communication.client';
import { FunnelEventClient, type FunnelEvent } from '../integrations/funnel-event.client';
import { TemplatesService } from '../templates/templates.service';
import type { MessageChannel } from '../templates/templates.types';
import type { DispatchSendMessageInput } from '../experiments/experiments.types';

type ActionRequestedPayload = {
  plan_id?: string;
  lead_id?: string;
  decision_id?: string;
  step?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeSendMessageStep(step: unknown): DispatchSendMessageInput | null {
  const rec = asRecord(step);
  if (!rec) return null;

  const type = rec.type;
  if (type !== 'SEND_MESSAGE') return null;

  const step_id = (rec.step_id ?? rec.stepId) as string | undefined;
  const idempotency_key = (rec.idempotency_key ?? rec.idempotencyKey) as string | undefined;
  const channel = rec.channel as MessageChannel | undefined;
  const to = rec.to as string | undefined;

  if (!step_id || !idempotency_key || !channel || !to) return null;
  if (channel !== 'WHATSAPP' && channel !== 'EMAIL') return null;

  return {
    step_id: String(step_id),
    idempotency_key: String(idempotency_key),
    type: 'SEND_MESSAGE',
    channel,
    to: String(to),
    template_id: rec.template_id as string | undefined,
    subject: rec.subject as string | undefined,
    body: rec.body as string | undefined,
    variables: rec.variables as Record<string, string | number> | undefined,
    touch_kind: rec.touch_kind as DispatchSendMessageInput['touch_kind'] | undefined,
    counts_as_touch: typeof rec.counts_as_touch === 'boolean' ? rec.counts_as_touch : undefined,
  };
}

@Injectable()
export class DispatchWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DispatchWorker.name);
  private interval: NodeJS.Timeout | null = null;
  private tickInFlight = false;
  private cursorMs: number | null = null;
  private readonly processedEventIds = new Set<string>();
  private readonly processedIdempotency = new Map<string, { status: 'SENT' | 'FAILED'; at: string }>();

  constructor(
    private readonly funnelEventClient: FunnelEventClient,
    private readonly communicationClient: CommunicationClient,
    private readonly templatesService: TemplatesService,
  ) {}

  onModuleInit(): void {
    const enabled = (process.env.DISPATCH_WORKER_ENABLED ?? '').trim().toLowerCase() === 'true';
    if (!enabled) {
      return;
    }

    const startFrom = process.env.DISPATCH_REPLAY_FROM?.trim();
    if (startFrom) {
      const parsed = new Date(startFrom);
      if (!Number.isNaN(parsed.getTime())) {
        this.cursorMs = parsed.getTime();
      }
    }

    const intervalMs = Math.max(1000, Number(process.env.DISPATCH_POLL_INTERVAL_MS ?? 5000));
    this.interval = setInterval(() => void this.tick(), intervalMs);
    void this.tick();
    this.logger.log(`Dispatch worker enabled (interval=${intervalMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.tickInFlight) {
      return;
    }
    this.tickInFlight = true;

    try {
      const fromIso = this.cursorMs ? new Date(this.cursorMs).toISOString() : undefined;
      const events = await this.funnelEventClient.replayEvents({ from: fromIso });
      await this.processEvents(events);

      const maxOccurredAt = events.reduce<number | null>((acc, event) => {
        const ms = new Date(event.occurredAt).getTime();
        if (Number.isNaN(ms)) return acc;
        if (acc === null) return ms;
        return Math.max(acc, ms);
      }, this.cursorMs);

      this.cursorMs = maxOccurredAt;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Dispatch tick failed: ${message}`.trim());
    } finally {
      this.tickInFlight = false;
    }
  }

  private async processEvents(events: FunnelEvent[]): Promise<void> {
    for (const event of events) {
      if (!event?.eventId || this.processedEventIds.has(event.eventId)) {
        continue;
      }
      this.processedEventIds.add(event.eventId);

      if (event.eventType !== 'funnel.action.requested.v1') {
        continue;
      }

      const payload = event.payload as unknown as ActionRequestedPayload;
      const leadId = payload?.lead_id ?? event.leadId;
      const planId = payload?.plan_id;
      const decisionId = payload?.decision_id;
      const step = normalizeSendMessageStep(payload?.step);

      if (!leadId || !step) {
        continue;
      }

      await this.executeSendMessageStep({
        leadId,
        planId: typeof planId === 'string' ? planId : undefined,
        decisionId: typeof decisionId === 'string' ? decisionId : undefined,
        step,
      });
    }
  }

  private async executeSendMessageStep(input: {
    leadId: string;
    planId?: string;
    decisionId?: string;
    step: DispatchSendMessageInput;
  }): Promise<void> {
    const step = input.step;
    if (this.processedIdempotency.has(step.idempotency_key)) {
      return;
    }

    const countsAsTouch = step.counts_as_touch ?? true;
    const sentAt = new Date().toISOString();

    try {
      const { subject, body } = await this.resolveContent(step);

      const sendResult = await this.communicationClient.sendMessage({
        channel: step.channel,
        to: step.to,
        subject,
        body,
        metadata: {
          lead_id: input.leadId,
          plan_id: input.planId,
          decision_id: input.decisionId,
          step_id: step.step_id,
          idempotency_key: step.idempotency_key,
          touch_kind: step.touch_kind,
          counts_as_touch: countsAsTouch,
        },
      });

      this.processedIdempotency.set(step.idempotency_key, { status: 'SENT', at: sentAt });

      await this.funnelEventClient.appendEvent({
        leadId: input.leadId,
        eventType: 'funnel.outbound.message.sent.v1',
        occurredAt: sentAt,
        payload: {
          plan_id: input.planId,
          decision_id: input.decisionId,
          step_id: step.step_id,
          lead_id: input.leadId,
          channel: step.channel,
          to: step.to,
          provider: sendResult.provider,
          provider_message_id: sendResult.provider_message_id,
          sent_at: sentAt,
          touch_kind: step.touch_kind,
          counts_as_touch: countsAsTouch,
          idempotency_key: step.idempotency_key,
        },
      });
    } catch (err) {
      const failedAt = new Date().toISOString();
      const message = err instanceof Error ? err.message : String(err);
      this.processedIdempotency.set(step.idempotency_key, { status: 'FAILED', at: failedAt });

      await this.funnelEventClient.appendEvent({
        leadId: input.leadId,
        eventType: 'funnel.outbound.message.failed.v1',
        occurredAt: failedAt,
        payload: {
          plan_id: input.planId,
          decision_id: input.decisionId,
          step_id: step.step_id,
          lead_id: input.leadId,
          channel: step.channel,
          to: step.to,
          failed_at: failedAt,
          error_code: 'DISPATCH_FAILED',
          error_message: message,
          touch_kind: step.touch_kind,
          counts_as_touch: step.counts_as_touch ?? true,
          idempotency_key: step.idempotency_key,
        },
      });
    }
  }

  private async resolveContent(step: DispatchSendMessageInput): Promise<{ subject?: string; body: string }> {
    if (step.body?.trim()) {
      return { subject: step.subject, body: step.body.trim() };
    }

    if (!step.template_id) {
      throw new Error('Missing body or template_id');
    }

    const template = this.templatesService.ensureChannel(step.template_id, step.channel);
    const variables = step.variables ?? {};
    const rendered = this.templatesService.renderTemplate({
      template_id: template.template_id,
      variables,
    });

    const subject =
      step.channel === 'EMAIL'
        ? (step.subject ?? rendered.rendered_subject ?? template.subject ?? undefined)
        : undefined;

    return { subject, body: rendered.rendered_body };
  }
}

