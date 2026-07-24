# CLAUDE.md

`portal-service` is the membership-application intake API — the backend for the member
self-service portal's "apply for membership" flow (personal details → professional details
→ subscription/payment choice → payment → CRM review). It also accepts CRM-staff-created
applications (an INMO staff member creating an application on a member's behalf). It owns
its own MongoDB via Mongoose. No test suite exists; don't invent test commands.

The single most important thing to know before changing anything here: application status
past `in-progress` is driven entirely by inbound RabbitMQ events from account-service and
profile-service, not by this service's own REST endpoints — see the lifecycle rule below
before adding any status-mutating route.

## Commands

```bash
npm start              # node bin/portal-service.js
npm run dev             # NODE_ENV=development
npm run staging         # NODE_ENV=staging
npm run dev:watch       # nodemon, development
npm run staging:watch   # nodemon, staging
```

Default port is `4000`. `.env.development`/`.env.staging` are loaded by `NODE_ENV`;
production uses Azure Application Settings (see the guard at the top of `app.js`).

### Legacy docs
@.claude/rules/legacy-docs.md

### Application data model
@.claude/rules/application-data-model.md

### Application status lifecycle
@.claude/rules/application-lifecycle.md

### Auth and authorization
@.claude/rules/auth-and-authorization.md

### Payment frequency rule
@.claude/rules/payment-frequency-rule.md

### Response envelope
@.claude/rules/response-envelope.md
