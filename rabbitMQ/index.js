// Main RabbitMQ module exports - Now using shared middleware
const {
  init,
  publisher,
  consumer,
  EVENT_TYPES: MIDDLEWARE_EVENT_TYPES,
  shutdown,
} = require("@projectShell/rabbitmq-middleware");

// Import local event definitions
const { PROFILE_EVENTS } = require("./events/profile.application.create.js");

// Import event handlers
const {
  handleApplicationStatusUpdate,
} = require("./listeners/eventHandler.js");

// Initialize event system
async function initEventSystem() {
  try {
    await init({
      url: process.env.RABBIT_URL,
      logger: console,
      prefetch: 10,
    });
    console.log("✅ Event system initialized with middleware");
  } catch (error) {
    console.error("❌ Failed to initialize event system:", error.message);
    throw error;
  }
}

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

// Set up consumers using middleware
async function setupConsumers() {
  try {
    console.log("🔧 Setting up RabbitMQ consumers...");

    // Payment service events queue (accounts.events exchange)
    const PAYMENT_QUEUE = "portal.payment.events";
    console.log("🔧 [SETUP] Creating payment queue...");
    console.log("   Queue:", PAYMENT_QUEUE);
    console.log("   Exchange: accounts.events");
    console.log("   Routing Key: application.status.updated");

    // Create queue with DLQ support
    await consumer.createQueue(PAYMENT_QUEUE, {
      durable: true,
      messageTtl: 3600000, // 1 hour
    });

    // Bind to exchange
    await consumer.bindQueue(PAYMENT_QUEUE, "accounts.events", [
      "application.status.updated",
    ]);

    // Register handler
    consumer.registerHandler(
      "application.status.updated",
      async (payload, context) => {
        await handleApplicationStatusUpdate(
          payload,
          context.routingKey,
          context.message
        );
      }
    );

    // Start consuming
    await consumer.consume(PAYMENT_QUEUE, { prefetch: 10 });
    console.log("✅ Payment service events consumer ready:", PAYMENT_QUEUE);

    console.log("✅ All consumers set up successfully");
  } catch (error) {
    console.error("❌ Failed to set up consumers:", error.message);
    console.error("❌ Stack trace:", error.stack);
    throw error;
  }
}

// Graceful shutdown using middleware
async function shutdownEventSystem() {
  try {
    await shutdown();
    console.log("✅ Event system shutdown complete");
  } catch (error) {
    console.error("❌ Error during event system shutdown:", error.message);
  }
}

// Utility function
function generateEventId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Export event types (merge middleware and local events)
const EVENT_TYPES = {
  ...MIDDLEWARE_EVENT_TYPES,
  PROFILE_EVENTS,
};

const QUEUES = {
  PAYMENT_EVENTS: "portal.payment.events",
};

module.exports = {
  // Middleware functions
  init,
  publisher,
  consumer,
  shutdown,

  // Service functions
  EVENT_TYPES,
  QUEUES,
  PROFILE_EVENTS,
  initEventSystem,
  publishDomainEvent,
  setupConsumers,
  shutdownEventSystem,
};
