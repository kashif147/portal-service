# Application data model

## Three collections, one shared `applicationId`

An "application" is split across three Mongoose models —
`models/{personal,professional,subscription}.details.model.js` — each keyed by a shared
`applicationId` (a UUID string generated on `PersonalDetails` creation, **not** a Mongo
`ObjectId`). There is no single "Application" document; `handlers/application.handler.js`'s
`getApplicationWithDetails()`/`getAllApplicationsWithDetails()` join the three collections
back together for the CRM-facing read APIs.

When adding a field that needs to be visible across all three, decide up front which
collection actually owns it. `professionalCategory`/`membershipCategory` in particular gets
read from and merged across both `ProfessionalDetails` and `SubscriptionDetails` for
backward compatibility — see `helpers/membershipCategory.helper.js`'s
`mergeLegacyProfessionalFieldsFromSubscription`.

## CRM-created vs. self-service applications

`helpers/get.user.info.js`'s `extractUserAndCreatorContext(req)` branches on
`req.user.userType` (`"PORTAL"` vs `"CRM"`, see `constants/enums.js`'s `USER_TYPE`): a
self-service portal user gets `PersonalDetails.userId` set to their own id; a
CRM-staff-created application gets `userId: null`. Check `userType` before relying on
`userId` being populated — any code path that assumes it always is (e.g. "my applications"
lookups) will silently miss/break CRM-created applications.

## Membership number generation does not happen here

`helpers/membership.number.generator.js` exists but is unused/orphaned — nothing imports
it; grep before trusting it. Numbering happens in profile-service during approval;
portal-service only stores/syncs application data.
