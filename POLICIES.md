# Políticas Canónicas (Anti-acoso, Selección de Canal, Idempotencia)

Fecha: 2026-05-10

Este archivo define decisiones "canónicas" del sistema para que todos los servicios implementen lo mismo.

## 1) Anti-acoso (contact frequency)

### 1.1 Definiciones
- **Touch**: cualquier `SEND_MESSAGE` con `counts_as_touch=true` (default).
- El canal del touch es `WHATSAPP` o `EMAIL`.
- Inbound del doctor/secretaria NO cuenta como touch (obvio), pero sí afecta la estrategia.

### 1.2 Regla de mínimos (MVP)
Parámetros por lead (configurables en `funnel-lead-service` constraints):
- `max_touches_per_day` (default 2)
- `min_hours_between_touches` (default 20)
- `quiet_hours_local` (default 08:00–18:00 en timezone del lead)

**Bloqueo**: el orquestador NO debe emitir pasos `SEND_MESSAGE` si:
- `do_not_contact=true`
- `cooldown_until > now`
- ya se alcanzó `max_touches_per_day` en el día local del lead
- no han pasado `min_hours_between_touches` desde el último touch exitoso
- estamos fuera de `quiet_hours_local` (si aplica)

### 1.3 Compromisos (snooze)
- Un compromiso del tipo "escríbeme en 1 mes" se guarda como `commitment(kind=FOLLOW_UP, due_at=...)`.
- Hasta que venza `due_at`, el orquestador debe mantener `cooldown_until=due_at` (o respetarlo en evaluación).

## 2) Selección de canal (WhatsApp vs Email)

### 2.1 Reglas base (orden)
1) Si estamos **respondiendo** un inbound reciente (ej: 24h), usar el mismo canal del inbound.
2) Si el lead tiene `preferred_channel` y existe el dato (teléfono/email), usarlo.
3) Si existe `last_successful_channel` (derivado desde eventos `...message.sent.v1`), usarlo.
4) Si el lead NO tiene teléfono pero sí email -> EMAIL. Si tiene teléfono y no email -> WHATSAPP.
5) Si hay A/B policy activa, permitir que la policy defina el canal (siempre que el dato exista y no esté bloqueado).

### 2.2 Casos especiales
- Si el lead está marcado como `ASSISTANT` primary (gatekeeper), el "to" debe ser el contacto del participant, no necesariamente el del doctor.
- Si el canal elegido está en `channel_blocklist`, elegir el otro; si ambos bloqueados, NO enviar (crear task interno).

## 3) Idempotencia (qué es “lo mismo”)

### 3.1 Clave recomendada para steps
Formato sugerido:
`{lead_id}:{step_type}:{semantic_key}:{yyyymmdd?}:{variant?}`

Ejemplos:
- Envío oferta piloto (1 vez/día): `lead:...:SEND_MESSAGE:pilot_offer:20260510:variantA`
- Reminder pago (1 vez/semana): `lead:...:SEND_MESSAGE:payment_reminder:week_2026_19`
- Timer reevaluate por commitment: `lead:...:CREATE_TIMER:commitment:{commitment_id}`

### 3.2 Regla de oro
Si un step es reintentado por fallas técnicas, debe reusar la misma `idempotency_key`.

