// Event publisher utility to avoid circular dependencies
const { publisher } = require("@projectShell/rabbitmq-middleware");

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
    console.log("✅ [DOMAIN EVENT] Published successfully:", {
      eventType,
      eventId: result.eventId,
    });
  } else {
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
