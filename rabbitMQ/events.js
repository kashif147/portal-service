const { publishEvent } = require("./publisher.js");
const {
  initConsumer,
  createQueue,
  consumeQueue,
  stopAllConsumers,
} = require("./consumer.js");

const { PROFILE_EVENTS } = require("./events/index.js");
const {
  handleApplicationStatusUpdate,
} = require("./listeners/eventHandler.js");

// Initialize event system
async function initEventSystem() {
  try {
    await initConsumer();
    console.log("✅ Event system initialized");
  } catch (error) {
    console.error("❌ Failed to initialize event system:", error.message);
    throw error;
  }
}

// Publish events with standardized payload structure
async function publishDomainEvent(eventType, data, metadata = {}) {
  const payload = {
    eventId: generateEventId(),
    eventType,
    timestamp: new Date().toISOString(),
    data,
    metadata: {
      service: "portal-service",
      version: "1.0",
      ...metadata,
    },
  };

  console.log("📤 [DOMAIN EVENT] Publishing:", {
    eventType,
    eventId: payload.eventId,
    dataKeys: Object.keys(data),
    timestamp: payload.timestamp,
  });

  const success = await publishEvent(eventType, payload);

  if (success) {
    console.log("✅ [DOMAIN EVENT] Published successfully:", {
      eventType,
      eventId: payload.eventId,
    });
  } else {
    console.error("❌ [DOMAIN EVENT] Failed to publish:", {
      eventType,
      eventId: payload.eventId,
    });
  }

  return success;
}

// Set up consumers for different event types
async function setupConsumers() {
  try {
    console.log("🔧 Setting up RabbitMQ consumers...");

    // Payment service events queue (accounts.events exchange)
    const PAYMENT_QUEUE = "portal.payment.events";
    console.log("🔧 [SETUP] Creating payment queue...");
    console.log("   Queue:", PAYMENT_QUEUE);
    console.log("   Exchange: accounts.events");
    console.log("   Routing Key: application.status.updated");

    await createQueue(PAYMENT_QUEUE, "accounts.events", [
      "application.status.updated",
    ]);
    await consumeQueue(PAYMENT_QUEUE, handleApplicationStatusUpdate);
    console.log("✅ Payment service events consumer ready:", PAYMENT_QUEUE);

    console.log("✅ All consumers set up successfully");
  } catch (error) {
    console.error("❌ Failed to set up consumers:", error.message);
    console.error("❌ Stack trace:", error.stack);
    throw error;
  }
}

// Utility functions
function generateEventId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Graceful shutdown
async function shutdownEventSystem() {
  try {
    await stopAllConsumers();
    console.log("✅ Event system shutdown complete");
  } catch (error) {
    console.error("❌ Error during event system shutdown:", error.message);
  }
}

module.exports = {
  PROFILE_EVENTS,
  initEventSystem,
  publishDomainEvent,
  setupConsumers,
  shutdownEventSystem,
};
