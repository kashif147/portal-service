const amqplib = require("amqplib");

let channel;
let connection;

async function initRabbit() {
  if (connection) return;

  const url = process.env.RABBIT_URL || "amqp://localhost:5672";
  connection = await amqplib.connect(url);
  channel = await connection.createChannel();
  await channel.assertExchange("portal.events", "topic", { durable: true });

  console.log("✅ RabbitMQ publisher initialized - exchange: portal.events");

  // Handle connection events
  connection.on("error", (err) => {
    console.warn("❌ RabbitMQ publisher connection error:", err.message);
  });

  connection.on("close", () => {
    console.warn("⚠️ RabbitMQ publisher connection closed");
    channel = null;
    connection = null;
  });

  channel.on("error", (err) => {
    console.warn("❌ RabbitMQ publisher channel error:", err.message);
  });

  channel.on("close", () => {
    console.warn("⚠️ RabbitMQ publisher channel closed");
    channel = null;
  });
}

async function publishEvent(routingKey, payload, options = {}) {
  try {
    if (!channel) await initRabbit();

    const messageOptions = {
      contentType: "application/json",
      persistent: true,
      timestamp: Date.now(),
      ...options,
    };

    console.log("📤 [PUBLISHER] Publishing event:", {
      exchange: "portal.events",
      routingKey,
      eventId: payload.eventId,
      eventType: payload.eventType,
      timestamp: new Date().toISOString(),
    });

    const success = channel.publish(
      "portal.events",
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      messageOptions
    );

    if (success) {
      console.log("✅ [PUBLISHER] Event published successfully:", {
        routingKey,
        eventId: payload.eventId,
        eventType: payload.eventType,
      });
    } else {
      console.warn(
        "⚠️ [PUBLISHER] Event publish failed - channel returned false:",
        {
          routingKey,
          eventId: payload.eventId,
          eventType: payload.eventType,
        }
      );
    }

    return success;
  } catch (error) {
    console.error("❌ [PUBLISHER] Failed to publish event:", {
      error: error.message,
      stack: error.stack,
      routingKey,
      eventId: payload?.eventId,
    });
    return false;
  }
}

async function closePublisher() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log("✅ RabbitMQ publisher closed");
  } catch (error) {
    console.warn("⚠️ Error closing publisher:", error.message);
  }
}

module.exports = {
  publishEvent,
  initRabbit,
  closePublisher,
};
