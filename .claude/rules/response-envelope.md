# Response envelope

Routes/controllers use `middlewares/response.mw.js`'s attached helpers (`res.success()` /
`res.fail()`-style) rather than hand-rolled `res.json()`. Helper names can vary between
services in this platform — check `middlewares/response.mw.js` in *this* repo for the
exact helper names before assuming one from a sibling service's `CLAUDE.md` applies here.
