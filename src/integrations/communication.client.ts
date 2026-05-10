import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { MessageChannel } from '../templates/templates.types';

type SendResult = {
  provider: string;
  provider_message_id?: string;
  raw?: unknown;
};

@Injectable()
export class CommunicationClient {
  private readonly logger = new Logger(CommunicationClient.name);

  private baseUrl(): string | null {
    const baseUrl = process.env.COMMUNICATION_BASE_URL?.trim();
    return baseUrl ? baseUrl.replace(/\/$/, '') : null;
  }

  async sendMessage(input: {
    channel: MessageChannel;
    to: string;
    subject?: string;
    body: string;
    metadata?: Record<string, unknown>;
  }): Promise<SendResult> {
    const baseUrl = this.baseUrl();
    if (!baseUrl) {
      throw new BadRequestException('COMMUNICATION_BASE_URL is not configured');
    }

    if (input.channel === 'WHATSAPP') {
      const res = await this.postJson(`${baseUrl}/whatsapp/messages`, {
        to: input.to,
        body: input.body,
        metadata: input.metadata,
      });
      return {
        provider: 'meta-whatsapp',
        provider_message_id: this.extractProviderMessageId(res.data),
        raw: res.data,
      };
    }

    const subject = input.subject?.trim();
    if (!subject) {
      throw new BadRequestException('subject is required for EMAIL');
    }

    const res = await this.postJson(`${baseUrl}/email/messages`, {
      to: input.to,
      subject,
      text: input.body,
      metadata: input.metadata,
    });

    return {
      provider: 'brevo',
      provider_message_id: this.extractProviderMessageId(res.data),
      raw: res.data,
    };
  }

  private async postJson(url: string, body: unknown): Promise<{ data: unknown }> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text().catch(() => '');
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // keep text
    }

    if (!res.ok) {
      this.logger.warn(`communication-service error ${res.status}: ${text}`.trim());
      throw new BadRequestException('communication_service_failed');
    }

    return { data };
  }

  private extractProviderMessageId(raw: unknown): string | undefined {
    if (!raw || typeof raw !== 'object') {
      return undefined;
    }
    const record = raw as Record<string, unknown>;
    const candidates = [
      record.providerMessageSid,
      record.provider_message_id,
      record.providerMessageId,
      record.messageId,
      record.id,
    ];
    const first = candidates.find((v) => typeof v === 'string' && v.trim().length > 0);
    return typeof first === 'string' ? first : undefined;
  }
}

