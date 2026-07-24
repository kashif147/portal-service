# Payment frequency business rule

`helpers/payment.frequency.helper.js`'s `enforcePaymentFrequencyRule()` runs on every
subscription-details create/update: Credit Card payment (`CARD_PAYMENT`) forces
`paymentFrequency` to `"Annually"`; every other payment type forces `"Monthly"`. This is
enforced server-side regardless of what the client sends — don't trust or pass through a
client-supplied `paymentFrequency` for `CARD_PAYMENT`, it gets overwritten.

`PAYMENT_FREQUENCY_RULE.md` (repo root) is accurate and current for the full rationale —
verified against `services/subscription.details.service.js`.
