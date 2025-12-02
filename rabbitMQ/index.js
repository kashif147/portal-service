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

// Import the listeners
const ApplicationStatusUpdateListener = require("./listeners/application.status.submitted.listener.js");
const ApplicationApprovalListener = require("./listeners/application.approval.listener.js");
const ApplicationRejectionListener = require("./listeners/application.rejection.listener.js");

// Import event publisher utility
const { publishDomainEvent } = require("./utils/eventPublisher.js");

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

// Set up consumers using middleware
async function setupConsumers() {
  try {
    console.log("🔧 Setting up RabbitMQ consumers...");

    // Payment service events queue (accounts.events exchange)
    const PAYMENT_QUEUE = "portal.payment.events";
    console.log("🔧 [SETUP] Creating payment queue...");
    console.log("   Queue:", PAYMENT_QUEUE);
    console.log("   Exchange: accounts.events");
    console.log(
      "   Routing Keys: application.status.updated, application.status.submitted"
    );

    // Create queue with DLQ support
    await consumer.createQueue(PAYMENT_QUEUE, {
      durable: true,
      messageTtl: 3600000, // 1 hour
    });

    // Bind to exchange - listen for both routing keys
    // account-service publishes "application.status.submitted"
    // but we also support "application.status.updated" for backward compatibility
    await consumer.bindQueue(PAYMENT_QUEUE, "accounts.events", [
      "application.status.updated",
      "application.status.submitted",
    ]);

    // Register handler for both routing keys
    const handlePaymentEvent = async (payload, context) => {
      const { data } = payload;
      console.log(
        "📥 [PAYMENT_EVENT] Received payment event:",
        {
          routingKey: context.routingKey,
          applicationId: data?.applicationId,
          status: data?.status,
        }
      );
      await ApplicationStatusUpdateListener.handleApplicationStatusUpdate(
        data
      );
    };

    consumer.registerHandler("application.status.updated", handlePaymentEvent);
    consumer.registerHandler(
      "application.status.submitted",
      handlePaymentEvent
    );

    // Start consuming
    await consumer.consume(PAYMENT_QUEUE, { prefetch: 10 });
    console.log("✅ Payment service events consumer ready:", PAYMENT_QUEUE);

    // Application approval/rejection events queue (application.events exchange)
    const APPROVAL_QUEUE = "portal.application.approval.events";
    console.log("🔧 [SETUP] Creating application approval/rejection queue...");
    console.log("   Queue:", APPROVAL_QUEUE);
    console.log("   Exchange: application.events");
    console.log(
      "   Routing Keys: applications.review.approved.v1, applications.review.rejected.v1"
    );

    await consumer.createQueue(APPROVAL_QUEUE, {
      durable: true,
      messageTtl: 3600000, // 1 hour
    });

    await consumer.bindQueue(APPROVAL_QUEUE, "application.events", [
      "applications.review.approved.v1",
      "applications.review.rejected.v1",
    ]);

    consumer.registerHandler(
      "applications.review.approved.v1",
      async (payload, context) => {
        const { data } = payload;
        console.log(
          "📥 [APPROVAL_EVENT] Received application approval event:",
          {
            routingKey: context.routingKey,
            applicationId: data?.applicationId,
            applicationStatus: data?.applicationStatus,
          }
        );
        await ApplicationApprovalListener.handleApplicationApproved(data);
      }
    );

    consumer.registerHandler(
      "applications.review.rejected.v1",
      async (payload, context) => {
        const { data } = payload;
        console.log(
          "📥 [REJECTION_EVENT] Received application rejection event:",
          {
            routingKey: context.routingKey,
            applicationId: data?.applicationId,
            reason: data?.reason,
          }
        );
        await ApplicationRejectionListener.handleApplicationRejected(data);
      }
    );

    await consumer.consume(APPROVAL_QUEUE, { prefetch: 10 });
    console.log(
      "✅ Application approval/rejection events consumer ready:",
      APPROVAL_QUEUE
    );

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

// Export event types (merge middleware and local events)
const EVENT_TYPES = {
  ...MIDDLEWARE_EVENT_TYPES,
  PROFILE_EVENTS,
};

const QUEUES = {
  PAYMENT_EVENTS: "portal.payment.events",
  APPROVAL_EVENTS: "portal.application.approval.events",
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
