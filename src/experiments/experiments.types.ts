import type { ISODateTime, UUID } from '../templates/templates.types';
import type { MessageChannel } from '../templates/templates.types';

export type ProductKey =
  | 'AGENDA_INTELIGENTE'
  | 'HC_INTEROPERABLE_RIPS'
  | 'MARKETPLACE_MEDICOS'
  | 'PAGOS_Y_REPORTES'
  | 'FACTURACION_ELECTRONICA'
  | 'ASISTENTE_WHATSAPP'
  | 'MEURED';

export type ExperimentStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

export type ExperimentVariant = {
  key: 'A' | 'B' | 'C';
  weight: number;
  template_id?: UUID;
  policy_flags?: Record<string, boolean | number | string>;
};

export type Experiment = {
  experiment_id: UUID;
  name: string;
  status: ExperimentStatus;
  targeting?: {
    product_key?: ProductKey;
    segment_id?: string;
  };
  variants: ExperimentVariant[];
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type ExperimentAssignment = {
  experiment_id: UUID;
  lead_id: UUID;
  variant_key: string;
  assigned_at: ISODateTime;
};

export type DispatchSendMessageInput = {
  step_id: UUID;
  idempotency_key: string;
  type: 'SEND_MESSAGE';
  channel: MessageChannel;
  to: string;
  template_id?: UUID;
  subject?: string;
  body?: string;
  variables?: Record<string, string | number>;
  touch_kind?: 'OUTREACH' | 'REPLY' | 'REMINDER' | 'NUDGE' | 'PAYMENT' | 'FEEDBACK';
  counts_as_touch?: boolean;
};

