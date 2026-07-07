// Event publisher utility to avoid circular dependencies
const { publisher } = require("@projectShell/rabbitmq-middleware");
const bizLogger = require("../../config/bizLogger.js");

// Publish domain events using middleware
async function publishDomainEvent(eventType, data, metadata = {}) {
  const result = await publisher.publish(eventType, data, {
    tenantId: metadata.tenantId,
    correlationId: metadata.correlationId || generateEventId(),
    metadata: {
      service: "portal-service",
      version: "1.0",
      ...metadata,
    },
  });

  if (result.success) {
    bizLogger.business("RabbitMQ domain event published", {
      eventType,
      eventId: result.eventId,
      correlationId: result.payload?.correlationId || metadata.correlationId || null,
      tenantId: metadata.tenantId || data?.tenantId || null,
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
      tenantId: metadata.tenantId || data?.tenantId || null,
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
