# `funnel-campaign-service` -- Templates + Experimentos + Dispatch Worker

Fecha: 2026-05-10

## 1) Responsabilidad
- Gestionar templates de mensajes (WhatsApp/email) y su renderizado.
- Gestionar experimentos A/B (copy y/o policy flags) y asignación estable de variantes por lead.
- Ejecutar outbound **como worker** (expandido aquí, no servicio nuevo): consumir `funnel.action.requested.v1` y ejecutar `SEND_MESSAGE` llamando HTTP al `communication-service`.

## 2) Tipos (templates/experimentos)

```ts
import { UUID, ISODateTime, ProductKey } from './contracts';

export type MessageChannel = 'WHATSAPP' | 'EMAIL';

export type Template = {
  template_id: UUID;
  name: string;
  channel: MessageChannel;
  subject?: string | null; // email
  body: string;            // texto con placeholders {{name}}
  placeholders: string[];  // lista validada
  tags?: string[] | null;  // ej: ["pilot_offer", "trial_day_3"]
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type ExperimentStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
export type Experiment = {
  experiment_id: UUID;
  name: string;
  status: ExperimentStatus;
  targeting?: {
    product_key?: ProductKey;
    segment_id?: string;
  };
  variants: Array<{
    key: 'A' | 'B' | 'C';
    weight: number;     // suma 1.0
    template_id?: UUID; // para copy tests
    policy_flags?: Record<string, boolean | number | string>; // para policy tests
  }>;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type ExperimentAssignment = {
  experiment_id: UUID;
  lead_id: UUID;
  variant_key: string;  // 'A'|'B'...
  assigned_at: ISODateTime;
};
```

## 3) API HTTP

### 3.1 Templates
- `POST /v1/templates`
  - Request:
    ```ts
    export type CreateTemplateRequest = {
      name: string;
      channel: MessageChannel;
      subject?: string;
      body: string;
      placeholders: string[];
      tags?: string[];
    };
    ```
  - Response: `{ template: Template }`

- `GET /v1/templates/:templateId` -> `{ template: Template }`

### 3.2 Render
- `POST /v1/render`
  - Request:
    ```ts
    export type RenderTemplateRequest = {
      template_id: UUID;
      variables: Record<string, string | number>;
    };
    ```
  - Response:
    ```ts
    export type RenderTemplateResponse = {
      rendered_subject?: string;
      rendered_body: string;
    };
    ```

### 3.3 Experimentos
- `POST /v1/experiments` -> `{ experiment: Experiment }`
- `POST /v1/experiments/:experimentId/start` -> `{ experiment: Experiment }`
- `POST /v1/experiments/:experimentId/pause` -> `{ experiment: Experiment }`
- `GET /v1/experiments/:experimentId` -> `{ experiment: Experiment }`

### 3.4 Asignación estable
- `GET /v1/experiments/:experimentId/assignments/:leadId`
  - Response: `{ assignment: ExperimentAssignment }`
  - Semántica: si no existe, crear determinísticamente (hash lead_id -> variante por pesos).

## 4) Dispatch Worker (outbound)

### 4.1 Entrada
Consume eventos:
- `funnel.action.requested.v1` donde `step.type = 'SEND_MESSAGE'`

`step` esperado:
```ts
import { SendMessageStep } from './contracts';
export type DispatchSendMessageInput = SendMessageStep & {
  // se recomienda que venga listo: `to`, `body` o `template_id+variables`
};
```

### 4.2 Ejecución
Llamadas HTTP a `communication-service`:
- WhatsApp: `POST {COMMUNICATION_BASE_URL}/whatsapp/messages`
- Email: `POST {COMMUNICATION_BASE_URL}/email/messages`

### 4.3 Salida
Emitir a `funnel-event-service`:
- `funnel.outbound.message.sent.v1`
- `funnel.outbound.message.failed.v1`

Payload recomendado:
```ts
import { UUID, ISODateTime } from './contracts';

export type FunnelOutboundMessageSentV1 = {
  plan_id: UUID;
  decision_id: UUID;
  step_id: UUID;
  lead_id: UUID;
  channel: 'WHATSAPP' | 'EMAIL';
  to: string;
  provider: string;          // meta-whatsapp / brevo
  provider_message_id?: string;
  sent_at: ISODateTime;
};

export type FunnelOutboundMessageFailedV1 = {
  plan_id: UUID;
  decision_id: UUID;
  step_id: UUID;
  lead_id: UUID;
  channel: 'WHATSAPP' | 'EMAIL';
  to: string;
  failed_at: ISODateTime;
  error_code: string;
  error_message: string;
};
```

Idempotencia:
- El worker debe usar `step.idempotency_key` como clave para “no reenviar”.

Anti-acoso / analítica:
- El worker debe propagar `step.touch_kind` y `step.counts_as_touch` al evento de salida.
- El orquestador usa esos eventos para calcular `touches_today` y `min_hours_between_touches` (ver `planning/policies.md`).
