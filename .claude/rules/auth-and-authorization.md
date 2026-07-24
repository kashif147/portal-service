# Auth and authorization

`middlewares/auth.js` (mounted globally except for `/health`, `/`, `/api`, and `/auth/*`)
trusts gateway-verified headers (`x-jwt-verified: true` + `x-auth-source: gateway`,
validated via `@membership/policy-middleware/security`) as the primary path, with legacy
Bearer-JWT and `AUTH_BYPASS_ENABLED=true` fallbacks — same shape as every other service in
this platform (see the `cross-service-auth` skill).

## Authorization is auto-derived, not per-route

Unlike sibling services that pass an explicit `(resource, action)` to `requirePermission()`
per route, **every** route here goes through `middlewares/autoPolicy.middleware.js`'s
`autoRequirePermission()`, which derives the action from the HTTP method (`GET→read,
POST→create, PUT/PATCH→write, DELETE→delete`) and the resource from the route's mount path
via `ROUTE_RESOURCE_MAP` — which currently maps every route in this service
(`personal-details`, `professional-details`, `subscription-details`, `applications`, ...) to
the single resource name `"portal"`. So authorization checks in this service are really
just `portal:read`/`portal:create`/`portal:write`/`portal:delete`, not fine-grained
per-resource.

Replacement when finer-grained permissions are needed: extend `ROUTE_RESOURCE_MAP` with a
new resource name for the specific route, rather than reaching for an explicit
`requirePermission(resource, action)` call — that would break the auto-derivation pattern
every other route in this service relies on.

## One dead authorization client — don't build on it

`helpers/policyAdapter.js` is a second, **unused** authorization client (token-only, no
gateway-header forwarding) — nothing imports it. Its `defaultPolicyAdapter` export sits
unused alongside the real `middlewares/policy.middleware.js`; don't confuse the two, and
don't wire anything new to `policyAdapter.js`.
