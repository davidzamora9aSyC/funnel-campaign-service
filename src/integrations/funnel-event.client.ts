import { BadRequestException, Injectable, Logger } from '@nestjs/common';

export type FunnelEvent = {
  eventId: string;
  leadId: string;
  eventType: string;
  source: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

@Injectable()
export class FunnelEventClient {
  private readonly logger = new Logger(FunnelEventClient.name);

  private baseUrl(): string | null {
    const baseUrl = process.env.FUNNEL_EVENT_SERVICE_BASE_URL?.trim();
    return baseUrl ? baseUrl.replace(/\/$/, '') : null;
  }

  async appendEvent(input: {
    leadId: string;
    eventType: string;
    payload: Record<string, unknown>;
    occurredAt?: string;
  }): Promise<void> {
    const baseUrl = this.baseUrl();
    if (!baseUrl) {
      return;
    }

    const res = await fetch(`${baseUrl}/funnel/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        leadId: input.leadId,
        eventType: input.eventType,
        source: 'funnel-campaign-service',
        payload: input.payload,
        occurredAt: input.occurredAt,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`event append failed ${res.status}: ${text}`.trim());
    }
  }

  async replayEvents(input: { from?: string; to?: string; leadId?: string }): Promise<FunnelEvent[]> {
    const baseUrl = this.baseUrl();
    if (!baseUrl) {
      throw new BadRequestException('FUNNEL_EVENT_SERVICE_BASE_URL is not configured');
    }

    const res = await fetch(`${baseUrl}/funnel/events/replay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        leadId: input.leadId,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { events?: FunnelEvent[] };
    if (!res.ok) {
      throw new BadRequestException('event_replay_failed');
    }
    return Array.isArray(data.events) ? data.events : [];
  }
}

