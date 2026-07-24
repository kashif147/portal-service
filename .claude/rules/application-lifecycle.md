# Application status lifecycle — driven by RabbitMQ, not direct API calls

`constants/enums.js`'s `APPLICATION_STATUS`: `in-progress → submitted → processed | rejected`.
Transitions after `in-progress` are **not** made by this service's own REST endpoints —
they're driven by two inbound RabbitMQ consumers wired in `rabbitMQ/index.js`:

- **`accounts.events`** exchange, routing keys `application.status.updated` /
  `application.status.submitted` (account-service's payment lifecycle) →
  `rabbitMQ/listeners/application.status.submitted.listener.js`. Once a payment status is
  in its "captured" set (`submitted|paid|succeeded|completed|requires_capture|authorised|
  authorized`), it flips `PersonalDetails.applicationStatus` to `submitted`, records
  `paymentDetails` on `SubscriptionDetails` (the single source of truth for payment info),
  and publishes `PROFILE_EVENTS.APPLICATION_CREATE`
  (`rabbitMQ/events/profile.application.create.js`) so profile-service can sync the
  application into the canonical CRM Profile. A **re-application** (previously `rejected` or
  `meta.isActive: false`) gets its rejection metadata cleared as part of this same
  transition — see `isReapplication` in that listener, and
  `helpers/reactivatePortalApplication.helper.js` for the equivalent reset used elsewhere
  when a member edits professional/subscription details after a rejection.
- **`application.events`** exchange, routing keys `applications.review.processed.v1` /
  `applications.review.rejected.v1` (the CRM approval decision, published by
  profile-service) → `rabbitMQ/listeners/application.approval.listener.js` /
  `application.rejection.listener.js`. On `processed`, this also **overwrites**
  `personalInfo`/`contactInfo`/`professionalDetails`/`subscriptionDetails` with whatever
  `effective.*` snapshot the approval event carries — the CRM reviewer's edits during
  approval win over what the member originally submitted.

Don't add a new REST endpoint that mutates `applicationStatus` directly past
`in-progress` — extend one of these two listeners (or add a new event type) instead, so
the transition stays driven by the same account-service/profile-service event sources.
