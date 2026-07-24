# Legacy docs — don't trust these for current architecture

`PROFILE_SERVICE_EVENT_PUBLISHING.md` and `RABBITMQ_FIX_SUMMARY.md` both document a **legacy,
hand-rolled `amqplib` RabbitMQ layer** (`rabbitMQ/publisher.js`, `rabbitMQ/consumer.js`,
`rabbitMQ/events.js`, a `domain.events` exchange) that **no longer exists in this codebase**.

Replacement: `@projectShell/rabbitmq-middleware`, wired in `rabbitMQ/index.js` and
`rabbitMQ/utils/eventPublisher.js`, using real exchanges (`accounts.events`,
`application.events`, `membership.events`) — none of which match what those two docs
describe. Don't follow their code samples or exchange/queue names; read `rabbitMQ/index.js`
directly instead.

`PAYMENT_FREQUENCY_RULE.md`, by contrast, is accurate and current (verified against
`services/subscription.details.service.js`) — see `payment-frequency-rule.md` in this
directory.
