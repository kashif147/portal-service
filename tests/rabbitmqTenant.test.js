"use strict";
// RabbitMQ tenant contract for portal-service (F8/F10/H-31):
//   consumers scope every lookup by `payload.tenantId ?? data.tenantId` and
//   skip + log when absent; the producer publishes the tenant in the envelope
//   AND the data mirror. In-memory model fakes; the middleware publisher is
//   stubbed (no broker).
const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const { fakes, warnings } = require("./helpers/appHarness");
const { seed, store, reset } = fakes;

const { publisher } = require("@projectShell/rabbitmq-middleware");
const published = [];
publisher.publish = async (eventType, data, options) => {
  published.push({ eventType, data, options });
  return { success: true, eventId: "evt-test", payload: { correlationId: "c" } };
};

const statusListener = require("../rabbitMQ/listeners/application.status.submitted.listener");
const approvalListener = require("../rabbitMQ/listeners/application.approval.listener");
const rejectionListener = require("../rabbitMQ/listeners/application.rejection.listener");
const {
  handleProfessionalWorkLocationUpdated,
} = require("../rabbitMQ/listeners/professional.details.listener");
const {
  handleSubscriptionResignedInactive,
  handleSubscriptionResignationUndoneActive,
} = require("../rabbitMQ/listeners/subscription.personal.details.listener");
const { publishDomainEvent } = require("../rabbitMQ/utils/eventPublisher");

const TENANT_A = "68cbf7806080b4621d469d34";
const TENANT_B = "bbbbbbbbbbbbbbbbbbbbbbbb";
const SHARED_APP = "app-shared"; // same applicationId present in both tenants
const userId = new mongoose.Types.ObjectId().toString();

const row = (name, tenantId) =>
  store[name].find((d) => d.applicationId === SHARED_APP && d.tenantId === tenantId);

test.beforeEach(() => {
  reset();
  published.length = 0;
  warnings.length = 0;
  for (const tenantId of [TENANT_A, TENANT_B]) {
    seed("personal", {
      tenantId,
      applicationId: SHARED_APP,
      userId,
      applicationStatus: "in-progress",
      personalInfo: { forename: `P-${tenantId}` },
      meta: { userType: "PORTAL", deleted: false, isActive: true },
    });
    seed("professional", {
      tenantId,
      applicationId: SHARED_APP,
      userId,
      professionalDetails: { workLocation: "orig" },
      meta: { isActive: true },
    });
    seed("subscription", {
      tenantId,
      applicationId: SHARED_APP,
      userId,
      subscriptionDetails: { paymentType: "Credit Card", membershipCategory: "General" },
      meta: { isActive: true },
    });
  }
});

test("payment listener: tenant A event updates A only, never B", async () => {
  await statusListener.handleApplicationStatusUpdate(
    {
      applicationId: SHARED_APP,
      status: "succeeded",
      paymentIntentId: "pi_1",
      amount: 100,
      currency: "eur",
      tenantId: TENANT_A,
    },
    TENANT_A
  );
  assert.equal(row("personal", TENANT_A).applicationStatus, "submitted");
  assert.equal(row("subscription", TENANT_A).paymentDetails.paymentIntentId, "pi_1");
  assert.equal(row("personal", TENANT_B).applicationStatus, "in-progress");
  assert.equal(row("subscription", TENANT_B).paymentDetails, undefined);
});

test("payment listener: envelope tenant wins over a conflicting data.tenantId", async () => {
  await statusListener.handleApplicationStatusUpdate(
    { applicationId: SHARED_APP, status: "succeeded", tenantId: TENANT_B },
    TENANT_A
  );
  assert.equal(row("personal", TENANT_A).applicationStatus, "submitted");
  assert.equal(row("personal", TENANT_B).applicationStatus, "in-progress");
});

test("payment listener: data.tenantId is used when envelope has none", async () => {
  await statusListener.handleApplicationStatusUpdate(
    { applicationId: SHARED_APP, status: "succeeded", tenantId: TENANT_B },
    undefined
  );
  assert.equal(row("personal", TENANT_B).applicationStatus, "submitted");
  assert.equal(row("personal", TENANT_A).applicationStatus, "in-progress");
});

test("payment listener: no tenant anywhere -> skipped + logged, nothing touched, nothing published", async () => {
  await statusListener.handleApplicationStatusUpdate(
    { applicationId: SHARED_APP, status: "succeeded" },
    undefined
  );
  assert.equal(row("personal", TENANT_A).applicationStatus, "in-progress");
  assert.equal(row("personal", TENANT_B).applicationStatus, "in-progress");
  assert.equal(published.length, 0);
  assert.ok(warnings.some((w) => /no tenantId/i.test(w)));
});

test("producer: profile.application.create carries tenant in envelope AND data", async () => {
  await statusListener.handleApplicationStatusUpdate(
    { applicationId: SHARED_APP, status: "succeeded", tenantId: TENANT_A },
    TENANT_A
  );
  assert.equal(published.length, 1);
  const [evt] = published;
  assert.equal(evt.eventType, "profile.application.create");
  assert.equal(evt.options.tenantId, TENANT_A, "envelope tenant");
  assert.equal(evt.options.metadata.tenantId, TENANT_A);
  assert.equal(evt.data.tenantId, TENANT_A, "data mirror tenant");
  assert.equal(evt.data.personalDetails.tenantId, TENANT_A);
});

test("producer: publishDomainEvent mirrors metadata tenant into data and refuses tenantless events", async () => {
  assert.equal(await publishDomainEvent("profile.application.create", { applicationId: "x" }, { tenantId: TENANT_A }), true);
  assert.equal(published[0].options.tenantId, TENANT_A);
  assert.equal(published[0].data.tenantId, TENANT_A);

  assert.equal(await publishDomainEvent("profile.application.create", { applicationId: "x", tenantId: TENANT_B }), true);
  assert.equal(published[1].options.tenantId, TENANT_B, "data tenant promoted to envelope");

  assert.equal(await publishDomainEvent("profile.application.create", { applicationId: "x" }), false);
  assert.equal(published.length, 2, "tenantless event not published");
});

test("approval listener: tenant A event processes A only", async () => {
  await approvalListener.handleApplicationApproved(
    {
      applicationId: SHARED_APP,
      applicationStatus: "processed",
      effective: { professionalDetails: { workLocation: "approved" } },
    },
    TENANT_A
  );
  assert.equal(row("personal", TENANT_A).applicationStatus, "processed");
  assert.equal(row("professional", TENANT_A).professionalDetails.workLocation, "approved");
  assert.equal(row("personal", TENANT_B).applicationStatus, "in-progress");
  assert.equal(row("professional", TENANT_B).professionalDetails.workLocation, "orig");
});

test("approval listener: no tenant -> skipped", async () => {
  await approvalListener.handleApplicationApproved(
    { applicationId: SHARED_APP, applicationStatus: "processed" },
    undefined
  );
  assert.equal(row("personal", TENANT_A).applicationStatus, "in-progress");
  assert.equal(row("personal", TENANT_B).applicationStatus, "in-progress");
});

test("rejection listener: tenant A event rejects A only", async () => {
  await rejectionListener.handleApplicationRejected(
    { applicationId: SHARED_APP, reason: "nope" },
    TENANT_A
  );
  assert.equal(row("personal", TENANT_A).applicationStatus, "rejected");
  assert.equal(row("subscription", TENANT_A).meta.isActive, false);
  assert.equal(row("personal", TENANT_B).applicationStatus, "in-progress");
  assert.equal(row("subscription", TENANT_B).meta.isActive, true);
});

test("work-location listener: tenant A event updates A only; no tenant -> skipped", async () => {
  await handleProfessionalWorkLocationUpdated(
    { userId, applicationId: SHARED_APP, workLocation: "WL-new" },
    TENANT_A
  );
  assert.equal(row("professional", TENANT_A).professionalDetails.workLocation, "WL-new");
  assert.equal(row("professional", TENANT_B).professionalDetails.workLocation, "orig");

  await handleProfessionalWorkLocationUpdated(
    { userId, applicationId: SHARED_APP, workLocation: "WL-x" },
    undefined
  );
  assert.equal(row("professional", TENANT_B).professionalDetails.workLocation, "orig");
});

test("subscription membership listener: envelope tenant A deactivates A only; no tenant -> skipped", async () => {
  await handleSubscriptionResignedInactive({
    tenantId: TENANT_A,
    data: { applicationId: SHARED_APP },
  });
  assert.equal(row("personal", TENANT_A).meta.isActive, false);
  assert.equal(row("personal", TENANT_B).meta.isActive, true);

  await handleSubscriptionResignationUndoneActive({ data: { applicationId: SHARED_APP } });
  assert.equal(row("personal", TENANT_A).meta.isActive, false, "tenantless event ignored");
});

test("every listener query carried tenantId", async () => {
  fakes.calls.length = 0;
  await statusListener.handleApplicationStatusUpdate(
    { applicationId: SHARED_APP, status: "succeeded" },
    TENANT_A
  );
  await approvalListener.handleApplicationApproved(
    { applicationId: SHARED_APP, effective: { subscriptionDetails: { paymentType: "Credit Card" } } },
    TENANT_A
  );
  await rejectionListener.handleApplicationRejected({ applicationId: SHARED_APP }, TENANT_A);
  const unscoped = fakes.calls.filter((c) => c.op !== "create" && !c.query?.tenantId);
  assert.deepEqual(unscoped, []);
});
