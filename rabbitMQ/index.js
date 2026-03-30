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
const {
  handleProfessionalWorkLocationUpdated,
} = require("./listeners/professional.details.listener.js");
const {
  handleSubscriptionResignedInactive,
  handleSubscriptionCancelledInactive,
  handleSubscriptionResignationUndoneActive,
  handleSubscriptionCancellationUndoneActive,
} = require("./listeners/subscription.personal.details.listener.js");

// Import event publisher utility
const { publishDomainEvent } = require("./utils/eventPublisher.js");

// Initialize event system
async function initEventSystem() {
  try {
    // Create a logger that works with middleware's logger.info?.() pattern
    const rabbitMQLogger = {
      info: (...args) => {
        if (args.length === 2 && typeof args[0] === "string" && typeof args[1] === "object") {
          console.log(`[RabbitMQ] ${args[0]}`, args[1]);
        } else if (args.length === 1 && typeof args[0] === "string") {
          console.log(`[RabbitMQ] ${args[0]}`);
        } else {
          console.log("[RabbitMQ]", ...args);
        }
      },
      warn: (...args) => {
        if (args.length === 2 && typeof args[0] === "string" && typeof args[1] === "object") {
          console.warn(`[RabbitMQ] ${args[0]}`, args[1]);
        } else if (args.length === 1 && typeof args[0] === "string") {
          console.warn(`[RabbitMQ] ${args[0]}`);
        } else {
          console.warn("[RabbitMQ]", ...args);
        }
      },
      error: (...args) => {
        if (args.length === 2 && typeof args[0] === "string" && typeof args[1] === "object") {
          console.error(`[RabbitMQ] ${args[0]}`, args[1]);
        } else if (args.length === 1 && typeof args[0] === "string") {
          console.error(`[RabbitMQ] ${args[0]}`);
        } else {
          console.error("[RabbitMQ]", ...args);
        }
      },
    };

    await init({
      url: process.env.RABBIT_URL,
      logger: rabbitMQLogger,
      prefetch: 10,
      connectionName: "portal-service",
      serviceName: "portal-service",
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
      const { data, eventType, eventId } = payload;
      console.log(
        "📥 [PAYMENT_EVENT] Received payment event:",
        {
          eventType,
          eventId,
          routingKey: context.routingKey,
          exchange: context.exchange,
          applicationId: data?.applicationId,
          status: data?.status,
          tenantId: data?.tenantId,
          timestamp: new Date().toISOString(),
        }
      );
      try {
      await ApplicationStatusUpdateListener.handleApplicationStatusUpdate(
        data
      );
        console.log(
          "✅ [PAYMENT_EVENT] Successfully processed payment event:",
          {
            eventType,
            eventId,
            applicationId: data?.applicationId,
          }
        );
      } catch (error) {
        console.error(
          "❌ [PAYMENT_EVENT] Error processing payment event:",
          {
            eventType,
            eventId,
            applicationId: data?.applicationId,
            error: error.message,
            stack: error.stack,
          }
        );
        throw error; // Re-throw to let middleware handle retry/DLQ
      }
    };

    consumer.registerHandler("application.status.updated", handlePaymentEvent);
    consumer.registerHandler(
      "application.status.submitted",
      handlePaymentEvent
    );
    
    console.log("✅ Registered handlers for:", {
      routingKeys: ["application.status.updated", "application.status.submitted"],
      queue: PAYMENT_QUEUE,
      exchange: "accounts.events",
    });

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

    // Membership events queue for professional details and subscription status updates
    const MEMBERSHIP_QUEUE = "portal.membership.events";
    console.log("🔧 [SETUP] Creating membership queue...");
    console.log("   Queue:", MEMBERSHIP_QUEUE);
    console.log("   Exchanges: application.events, membership.events");
    console.log(
      "   Routing Keys: members.professionaldetails.worklocation.updated.v1, members.subscription.resigned.v1, members.subscription.cancelled.v1, members.subscription.resignation.undone.v1, members.subscription.cancellation.undone.v1"
    );

    await consumer.createQueue(MEMBERSHIP_QUEUE, {
      durable: true,
      messageTtl: 3600000, // 1 hour
    });

    // NOTE: Profile-service currently publishes this event to the
    // "application.events" exchange (see profile-service logs),
    // so we bind to that exchange here.
    await consumer.bindQueue(MEMBERSHIP_QUEUE, "application.events", [
      "members.professionaldetails.worklocation.updated.v1",
    ]);
    await consumer.bindQueue(MEMBERSHIP_QUEUE, "membership.events", [
      "members.subscription.resigned.v1",
      "members.subscription.cancelled.v1",
      "members.subscription.resignation.undone.v1",
      "members.subscription.cancellation.undone.v1",
    ]);

    consumer.registerHandler(
      "members.professionaldetails.worklocation.updated.v1",
      async (payload, context) => {
        const data = payload?.data || payload;
        console.log(
          "📥 [MEMBERSHIP_EVENT] Received professionalDetails workLocation update:",
          {
            routingKey: context.routingKey,
            userId: data?.userId,
            workLocation: data?.workLocation,
          }
        );
        await handleProfessionalWorkLocationUpdated(data);
      }
    );
    consumer.registerHandler(
      "members.subscription.resigned.v1",
      async (payload, context) => {
        console.log(
          "📥 [MEMBERSHIP_EVENT] Received subscription resigned event:",
          {
            routingKey: context.routingKey,
            subscriptionId: payload?.data?.subscriptionId || payload?.subscriptionId,
            applicationId: payload?.data?.applicationId || payload?.applicationId,
          }
        );
        await handleSubscriptionResignedInactive(payload);
      }
    );
    consumer.registerHandler(
      "members.subscription.cancelled.v1",
      async (payload, context) => {
        console.log(
          "📥 [MEMBERSHIP_EVENT] Received subscription cancelled event:",
          {
            routingKey: context.routingKey,
            subscriptionId: payload?.data?.subscriptionId || payload?.subscriptionId,
            applicationId: payload?.data?.applicationId || payload?.applicationId,
          }
        );
        await handleSubscriptionCancelledInactive(payload);
      }
    );
    consumer.registerHandler(
      "members.subscription.resignation.undone.v1",
      async (payload, context) => {
        console.log(
          "📥 [MEMBERSHIP_EVENT] Received subscription resignation undone event:",
          {
            routingKey: context.routingKey,
            subscriptionId: payload?.data?.subscriptionId || payload?.subscriptionId,
            applicationId: payload?.data?.applicationId || payload?.applicationId,
          }
        );
        await handleSubscriptionResignationUndoneActive(payload);
      }
    );
    consumer.registerHandler(
      "members.subscription.cancellation.undone.v1",
      async (payload, context) => {
        console.log(
          "📥 [MEMBERSHIP_EVENT] Received subscription cancellation undone event:",
          {
            routingKey: context.routingKey,
            subscriptionId: payload?.data?.subscriptionId || payload?.subscriptionId,
            applicationId: payload?.data?.applicationId || payload?.applicationId,
          }
        );
        await handleSubscriptionCancellationUndoneActive(payload);
      }
    );

    await consumer.consume(MEMBERSHIP_QUEUE, { prefetch: 10 });
    console.log("✅ Membership events consumer ready:", MEMBERSHIP_QUEUE);

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
