# Contratos Compartidos (Tipos, Eventos, Convenciones)

Fecha: 2026-05-10

Este archivo define contratos compartidos para todos los microservicios del funnel. Cada microservicio referencia estas definiciones y agrega sus tipos propios.

## 1) Convenciones generales

### 1.1 Identificadores y fechas
```ts
export type UUID = string;            // UUID v4
export type ISODateTime = string;     // ISO-8601 UTC (ej: "2026-05-10T18:04:23.123Z")
```

### 1.2 Canales
```ts
export type Channel = 'WHATSAPP' | 'EMAIL' | 'CALL' | 'MEETING' | 'INTERNAL';
export type PreferredChannel = 'WHATSAPP' | 'EMAIL';
```

### 1.3 Catálogo de productos
```ts
export type ProductKey =
  | 'AGENDA_INTELIGENTE'
  | 'HC_INTEROPERABLE_RIPS'
  | 'MARKETPLACE_MEDICOS'
  | 'PAGOS_Y_REPORTES'
  | 'FACTURACION_ELECTRONICA'
  | 'ASISTENTE_WHATSAPP'
  | 'MEURED';
```

### 1.4 Participantes (con quién hablamos)
```ts
export type ParticipantRole = 'DOCTOR' | 'ASSISTANT' | 'ADMIN';
```

### 1.5 Idempotencia
```ts
export type IdempotencyKey = string; // valor estable por "efecto" (send message, create booking, create timer, etc.)
```

### 1.6 Zona horaria
```ts
export type IanaTimeZone = string; // ej "America/Bogota"
```

## 2) Envelope de evento (estándar interno)

### 2.1 Nombres versionados
- `event_name` SIEMPRE es `string` namespaced y versionado.
- Ejemplo: `funnel.inbound.whatsapp_message.received.v1`

Sugerencia de formato:
- `<domain>.<area>.<action>.<detail>.v1`
- `domain` aquí es `funnel`.

### 2.2 Tipo base
```ts
export type EventEnvelopeV1<TPayload extends object> = {
  event_id: UUID;
  event_name: string;
  occurred_at: ISODateTime;
  recorded_at: ISODateTime;
  producer: string;                 // servicio que registró/produjo el evento
  lead_id?: UUID;
  correlation_id?: UUID;            // para agrupar una "historia" de steps/actions
  idempotency_key?: IdempotencyKey; // para deduplicar ingest/efectos cuando aplique
  payload: TPayload;
};
```

## 3) Errors (contrato)
Para APIs internas, estandarizar un error:
```ts
export type ApiError = {
  error: {
    code: string;      // ej: "VALIDATION_ERROR", "NOT_FOUND", "CONFLICT", "RATE_LIMITED"
    message: string;
    details?: unknown;
  };
};
```

## 4) Acciones: Action Plan + Steps

### 4.1 Tipos de step
```ts
export type ActionStepType =
  | 'SEND_MESSAGE'
  | 'CREATE_TIMER'
  | 'CANCEL_TIMER'
  | 'CREATE_BOOKING'
  | 'CANCEL_BOOKING'
  | 'GENERATE_PDF'
  | 'CREATE_TASK'
  | 'UPSERT_MEMORY'
  | 'NOOP';
```

### 4.2 Step base
```ts
export type ActionStepBase = {
  step_id: UUID;
  type: ActionStepType;
  idempotency_key: IdempotencyKey;
  depends_on_step_ids?: UUID[]; // para orquestar secuencias (ej: generar PDF antes de enviar email)
  metadata?: Record<string, unknown>;
};
```

### 4.3 Steps concretos (mínimo)
```ts
export type SendMessageStep = ActionStepBase & {
  type: 'SEND_MESSAGE';
  channel: 'WHATSAPP' | 'EMAIL';
  to: string; // phone_e164 o email (según channel)
  template_id?: string;
  subject?: string; // email
  body?: string;    // texto final
  variables?: Record<string, string | number>;
  // Para anti-acoso y analítica
  touch_kind?: 'OUTREACH' | 'REPLY' | 'REMINDER' | 'NUDGE' | 'PAYMENT' | 'FEEDBACK';
  counts_as_touch?: boolean; // default true
};

export type CreateTimerStep = ActionStepBase & {
  type: 'CREATE_TIMER';
  kind: 'REEVALUATE_NBA' | 'FOLLOW_UP' | 'DEMO_REMINDER' | 'TRIAL_NUDGE' | 'PAYMENT_REMINDER';
  run_at: ISODateTime;
  payload?: Record<string, unknown>;
};

export type CreateBookingStep = ActionStepBase & {
  type: 'CREATE_BOOKING';
  lead_id: UUID;
  rep_id: string;
  starts_at: ISODateTime;
  ends_at: ISODateTime;
  tz: string; // IANA tz
  title: string;
  notes?: string;
};

export type GeneratePdfStep = ActionStepBase & {
  type: 'GENERATE_PDF';
  template_key: string;
  data: Record<string, unknown>;
};

export type CreateTaskStep = ActionStepBase & {
  type: 'CREATE_TASK';
  title: string;
  due_at?: ISODateTime;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  assignee?: string;
};

export type ActionStep =
  | SendMessageStep
  | CreateTimerStep
  | CreateBookingStep
  | GeneratePdfStep
  | CreateTaskStep
  | (ActionStepBase & { type: 'NOOP' });
```

### 4.4 Plan
```ts
export type ActionPlan = {
  plan_id: UUID;
  lead_id: UUID;
  created_at: ISODateTime;
  steps: ActionStep[];
};
```

## 5) Contacto y "touches" (para anti-acoso)
```ts
export type TouchKind = 'OUTREACH' | 'REPLY' | 'REMINDER' | 'NUDGE' | 'PAYMENT' | 'FEEDBACK';

export type OutboundTouch = {
  lead_id: UUID;
  channel: 'WHATSAPP' | 'EMAIL';
  touch_kind: TouchKind;
  sent_at: ISODateTime;
  idempotency_key: IdempotencyKey;
};
```

## 6) Eventos “operativos” mínimos
Estos nombres se recomiendan como base; pueden crecer sin romper (por versionado).
- `funnel.nba.decided.v1`
- `funnel.action.requested.v1`
- `funnel.action.step.executed.v1`
- `funnel.action.step.failed.v1`
- `funnel.timer.fired.v1`
