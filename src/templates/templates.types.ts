export type UUID = string;
export type ISODateTime = string;

export type MessageChannel = 'WHATSAPP' | 'EMAIL';

export type Template = {
  template_id: UUID;
  name: string;
  channel: MessageChannel;
  subject?: string | null;
  body: string;
  placeholders: string[];
  tags?: string[] | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

