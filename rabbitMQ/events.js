const { publishEvent } = require("./publisher.js");
const {
  initConsumer,
  createQueue,
  consumeQueue,
  stopAllConsumers,
} = require("./consumer.js");

// Import event types and handlers from separate event files
const {
  APPLICATION_EVENTS,
  APPLICATION_QUEUES,
  handleApplicationEvent,
  PROFILE_EVENTS,
  PROFILE_QUEUES,
  handleProfileEvent,
} = require("./events/index.js");

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

    // 1. Internal application processing queue (domain.events exchange)
    await createQueue(
      APPLICATION_QUEUES.APPLICATION_PROCESSING,
      "domain.events",
      ["application.*"]
    );
    await consumeQueue(
      APPLICATION_QUEUES.APPLICATION_PROCESSING,
      handleApplicationEvent
    );
    console.log(
      "✅ Internal application processing consumer ready:",
      APPLICATION_QUEUES.APPLICATION_PROCESSING
    );

    // 2. Payment service events queue (accounts.events exchange)
    await createQueue(APPLICATION_QUEUES.PAYMENT_EVENTS, "accounts.events", [
      "application.status.updated",
    ]);
    await consumeQueue(
      APPLICATION_QUEUES.PAYMENT_EVENTS,
      handleApplicationEvent
    );
    console.log(
      "✅ Payment service events consumer ready:",
      APPLICATION_QUEUES.PAYMENT_EVENTS
    );

    // 3. Profile service events queue (domain.events exchange)
    await createQueue(PROFILE_QUEUES.PROFILE_EVENTS, "domain.events", [
      "profile.service.*",
    ]);
    await consumeQueue(PROFILE_QUEUES.PROFILE_EVENTS, handleProfileEvent);
    console.log(
      "✅ Profile service events consumer ready:",
      PROFILE_QUEUES.PROFILE_EVENTS
    );

    console.log("✅ All consumers set up successfully");
    console.log("📊 Active queues:", {
      internalQueue: APPLICATION_QUEUES.APPLICATION_PROCESSING,
      paymentQueue: APPLICATION_QUEUES.PAYMENT_EVENTS,
      profileQueue: PROFILE_QUEUES.PROFILE_EVENTS,
    });
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
  EVENT_TYPES: APPLICATION_EVENTS,
  QUEUES: APPLICATION_QUEUES,
  initEventSystem,
  publishDomainEvent,
  setupConsumers,
  shutdownEventSystem,
};
