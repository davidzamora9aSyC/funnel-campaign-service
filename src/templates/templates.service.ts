import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extractPlaceholders, renderTemplateText } from './template-renderer';
import type { CreateTemplateRequest, RenderTemplateRequest } from './templates.dto';
import type { MessageChannel, Template } from './templates.types';

@Injectable()
export class TemplatesService {
  private readonly templatesById = new Map<string, Template>();

  createTemplate(input: CreateTemplateRequest): Template {
    const name = input?.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    const channel = input?.channel;
    if (channel !== 'WHATSAPP' && channel !== 'EMAIL') {
      throw new BadRequestException('channel must be WHATSAPP or EMAIL');
    }

    const body = input?.body ?? '';
    if (!body.trim()) {
      throw new BadRequestException('body is required');
    }

    const subject = input?.subject ?? undefined;
    if (channel === 'EMAIL' && subject !== undefined && !String(subject).trim()) {
      throw new BadRequestException('subject must be non-empty when provided');
    }

    const placeholders = Array.isArray(input?.placeholders) ? input.placeholders : [];
    if (!placeholders.length) {
      throw new BadRequestException('placeholders is required and must be non-empty');
    }

    const normalizedPlaceholders = placeholders
      .map((p) => String(p).trim())
      .filter((p) => Boolean(p));

    const subjectText = subject ?? '';
    const extracted = Array.from(
      new Set([...extractPlaceholders(body), ...extractPlaceholders(subjectText)]),
    ).sort((a, b) => a.localeCompare(b));
    const uniqueNormalized = Array.from(new Set(normalizedPlaceholders)).sort((a, b) =>
      a.localeCompare(b),
    );

    if (extracted.join('|') !== uniqueNormalized.join('|')) {
      throw new BadRequestException({
        message: 'placeholders must match placeholders found in body/subject',
        details: { extracted, provided: uniqueNormalized },
      });
    }

    const now = new Date().toISOString();
    const template: Template = {
      template_id: randomUUID(),
      name,
      channel,
      subject: channel === 'EMAIL' ? (subject ?? null) : null,
      body,
      placeholders: extracted,
      tags: input?.tags?.length ? input.tags : null,
      created_at: now,
      updated_at: now,
    };

    this.templatesById.set(template.template_id, template);
    return template;
  }

  getTemplate(templateId: string): Template {
    const template = this.templatesById.get(templateId);
    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }
    return template;
  }

  renderTemplate(input: RenderTemplateRequest): {
    rendered_subject?: string;
    rendered_body: string;
  } {
    const templateId = input?.template_id?.trim();
    if (!templateId) {
      throw new BadRequestException('template_id is required');
    }

    const variables = input?.variables ?? null;
    if (!variables || typeof variables !== 'object') {
      throw new BadRequestException('variables is required');
    }

    const template = this.getTemplate(templateId);

    try {
      const renderedBody = renderTemplateText(template.body, variables, template.placeholders);
      const renderedSubject =
        template.channel === 'EMAIL' && template.subject
          ? renderTemplateText(template.subject, variables, template.placeholders)
          : undefined;

      return {
        rendered_subject: renderedSubject,
        rendered_body: renderedBody,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException({ message: 'render_failed', details: { reason: message } });
    }
  }

  ensureChannel(templateId: string, channel: MessageChannel): Template {
    const template = this.getTemplate(templateId);
    if (template.channel !== channel) {
      throw new BadRequestException(
        `Template channel mismatch: expected ${channel}, got ${template.channel}`,
      );
    }
    return template;
  }
}

