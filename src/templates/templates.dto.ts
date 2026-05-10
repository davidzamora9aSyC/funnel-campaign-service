import type { MessageChannel, UUID } from './templates.types';

export type CreateTemplateRequest = {
  name: string;
  channel: MessageChannel;
  subject?: string;
  body: string;
  placeholders: string[];
  tags?: string[];
};

export type RenderTemplateRequest = {
  template_id: UUID;
  variables: Record<string, string | number>;
};

