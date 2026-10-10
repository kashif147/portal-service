// Event publisher utility to avoid circular dependencies
const { publisher } = require("@projectShell/rabbitmq-middleware");
const bizLogger = require("../../config/bizLogger.js");

// Publish domain events using middleware.
//
// Tenant contract: every event carries the tenant in BOTH the envelope
// (`payload.tenantId`, from metadata.tenantId) and the data mirror
// (`data.tenantId`). metadata.tenantId is authoritative; data.tenantId is only
// used when metadata has none. An event with no tenant at all is NOT published.
async function publishDomainEvent(eventType, data, metadata = {}) {
  const tenantId =
    metadata.tenantId !== undefined && metadata.tenantId !== null && metadata.tenantId !== ""
      ? String(metadata.tenantId)
      : data && data.tenantId !== undefined && data.tenantId !== null && data.tenantId !== ""
      ? String(data.tenantId)
      : null;

  if (!tenantId) {
    bizLogger.error("RabbitMQ domain event not published: missing tenantId", {
      eventType,
      applicationId: data?.applicationId || null,
      routingKey: eventType,
      sourceService: "portal-service",
    });
    console.error("❌ [DOMAIN EVENT] Refusing to publish without tenantId:", {
      eventType,
    });
    return false;
  }

  if (
    data &&
    typeof data === "object" &&
    data.tenantId !== undefined &&
    data.tenantId !== null &&
    String(data.tenantId) !== tenantId
  ) {
    console.warn(
      "⚠️ [DOMAIN EVENT] data.tenantId differs from envelope tenantId; envelope wins",
      { eventType }
    );
  }

  const eventData =
    data && typeof data === "object" && !Array.isArray(data)
      ? { ...data, tenantId }
      : data;

  const result = await publisher.publish(eventType, eventData, {
    tenantId,
    correlationId: metadata.correlationId || generateEventId(),
    metadata: {
      service: "portal-service",
      version: "1.0",
      ...metadata,
      tenantId,
    },
  });

  if (result.success) {
    bizLogger.business("RabbitMQ domain event published", {
      eventType,
      eventId: result.eventId,
      correlationId: result.payload?.correlationId || metadata.correlationId || null,
      tenantId,
      applicationId: data?.applicationId || null,
      membershipId: data?.memberId || data?.membershipId || null,
      routingKey: eventType,
      sourceService: "portal-service",
    });
    console.log("✅ [DOMAIN EVENT] Published successfully:", {
      eventType,
      eventId: result.eventId,
    });
  } else {
    bizLogger.error("RabbitMQ domain event publish failed", {
      eventType,
      error: result.error,
      correlationId: metadata.correlationId || null,
      tenantId,
      applicationId: data?.applicationId || null,
      membershipId: data?.memberId || data?.membershipId || null,
      routingKey: eventType,
      sourceService: "portal-service",
    });
    console.error("❌ [DOMAIN EVENT] Failed to publish:", {
      eventType,
      error: result.error,
    });
  }

  return result.success;
}

// Utility function
function generateEventId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  publishDomainEvent,
};
