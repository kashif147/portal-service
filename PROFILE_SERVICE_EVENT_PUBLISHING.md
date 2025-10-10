# Profile Service Event Publishing - Complete Verification

## ✅ Event Publishing Chain Verified

### **Event Being Published:**

`profile.service.application.updated`

### **Publishing Flow:**

```javascript
// 1. Called from: applicationStatusUpdateListener.js (line 104)
await publishDomainEvent("profile.service.application.updated", {
  applicationId: applicationId,
  tenantId: tenantId,
  status: status,
  personalDetails: updatedPersonalDetails,
  professionalDetails: professionalDetails,
  subscriptionDetails: subscriptionDetails,
});
```

### **Complete Function Chain:**

#### **Step 1: publishDomainEvent() → `/rabbitMQ/events.js`**

```javascript
async function publishDomainEvent(eventType, data, metadata = {}) {
  const payload = {
    eventId: generateEventId(), // ✅ Unique event ID generated
    eventType, // ✅ "profile.service.application.updated"
    timestamp: new Date().toISOString(), // ✅ ISO timestamp
    data, // ✅ Your full data payload
    metadata: {
      service: "portal-service", // ✅ Source service
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

  const success = await publishEvent(eventType, payload); // ✅ Calls publisher

  if (success) {
    console.log("✅ [DOMAIN EVENT] Published successfully:", {
      eventType,
      eventId: payload.eventId,
    });
  }

  return success;
}
```

**What this does:**

- ✅ Wraps your data in standardized event envelope
- ✅ Generates unique eventId for tracking
- ✅ Adds timestamp and metadata
- ✅ Logs publishing attempt
- ✅ Calls lower-level publishEvent function

---

#### **Step 2: publishEvent() → `/rabbitMQ/publisher.js`**

```javascript
async function publishEvent(routingKey, payload, options = {}) {
  try {
    if (!channel) await initRabbit(); // ✅ Ensures connection exists

    const messageOptions = {
      contentType: "application/json",
      persistent: true, // ✅ Message survives broker restart
      timestamp: Date.now(),
      ...options,
    };

    console.log("📤 [PUBLISHER] Publishing event:", {
      exchange: "domain.events", // ✅ Publishing to domain.events
      routingKey, // ✅ "profile.service.application.updated"
      eventId: payload.eventId,
      eventType: payload.eventType,
      timestamp: new Date().toISOString(),
    });

    const success = channel.publish(
      "domain.events", // ✅ Exchange name
      routingKey, // ✅ Routing key
      Buffer.from(JSON.stringify(payload)), // ✅ Serialized payload
      messageOptions
    );

    if (success) {
      console.log("✅ [PUBLISHER] Event published successfully:", {
        routingKey,
        eventId: payload.eventId,
        eventType: payload.eventType,
      });
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
```

**What this does:**

- ✅ Initializes RabbitMQ connection if needed
- ✅ Sets message as persistent (durable)
- ✅ Publishes to `domain.events` exchange
- ✅ Uses routing key `profile.service.application.updated`
- ✅ Comprehensive error handling and logging

---

#### **Step 3: RabbitMQ Routing**

```
Exchange: domain.events (topic exchange)
Routing Key: profile.service.application.updated
    ↓
Matches Pattern: profile.service.*
    ↓
Bound to Queue: portal.profile.events
    ↓
Consumed by: handleProfileEvent
    ↓
Dispatched to: ProfileApplicationUpdateListener
```

---

## ✅ All Required Functions Exist

### **1. Publishing Functions:**

- ✅ `publishDomainEvent()` in `/rabbitMQ/events.js`
- ✅ `publishEvent()` in `/rabbitMQ/publisher.js`
- ✅ `initRabbit()` in `/rabbitMQ/publisher.js` (auto-initializes connection)
- ✅ `generateEventId()` in `/rabbitMQ/events.js` (creates unique IDs)

### **2. Export Configuration:**

- ✅ Exported from `/rabbitMQ/index.js`:
  ```javascript
  module.exports = {
    publishDomainEvent, // ✅ Main publishing function
    publishEvent, // ✅ Low-level publisher
    initRabbit, // ✅ Connection initializer
    // ... other exports
  };
  ```

### **3. Consumer Setup (for internal processing):**

- ✅ Queue `portal.profile.events` created
- ✅ Bound to `domain.events` exchange
- ✅ Routing key pattern `profile.service.*` matches
- ✅ Handler `handleProfileEvent` processes incoming events
- ✅ Listener `ProfileApplicationUpdateListener` handles the event

---

## 📊 Event Payload Structure

Your event is published with this complete structure:

```json
{
  "eventId": "1728567890123-abc123def",
  "eventType": "profile.service.application.updated",
  "timestamp": "2025-10-09T12:34:56.789Z",
  "data": {
    "applicationId": "APP-123",
    "tenantId": "tenant-456",
    "status": "paid",
    "personalDetails": {
      /* full object */
    },
    "professionalDetails": {
      /* full object */
    },
    "subscriptionDetails": {
      "paymentDetails": {
        /* payment info */
      }
    }
  },
  "metadata": {
    "service": "portal-service",
    "version": "1.0"
  }
}
```

---

## 🎯 For Profile Service (External Consumer)

If you have a **separate profile service** that needs to consume this event:

### **Profile Service Setup Required:**

```javascript
// In profile-service consumer setup
await channel.assertExchange("domain.events", "topic", { durable: true });

await channel.assertQueue("profile-service.application.updates", {
  durable: true,
});

await channel.bindQueue(
  "profile-service.application.updates",
  "domain.events",
  "profile.service.application.updated" // Exact routing key
);

await channel.consume("profile-service.application.updates", async (msg) => {
  const payload = JSON.parse(msg.content.toString());
  const { eventType, data } = payload;

  console.log("📥 Profile service received:", eventType, payload.eventId);

  // Process application update
  await handleApplicationUpdate(data);

  channel.ack(msg);
});
```

---

## 🔍 Testing & Verification

### **Check Event is Published:**

```bash
# Monitor logs when event is triggered
# You should see:
📤 [DOMAIN EVENT] Publishing: {
  eventType: 'profile.service.application.updated',
  eventId: '...',
  dataKeys: [ 'applicationId', 'tenantId', 'status', ... ]
}
📤 [PUBLISHER] Publishing event: {
  exchange: 'domain.events',
  routingKey: 'profile.service.application.updated',
  eventId: '...'
}
✅ [PUBLISHER] Event published successfully
✅ [DOMAIN EVENT] Published successfully
```

### **Check Internal Consumer Receives It:**

```bash
# Internal portal service consumer logs:
📥 [CONSUMER] Message received: {
  queueName: 'portal.profile.events',
  exchange: 'domain.events',
  routingKey: 'profile.service.application.updated',
  eventId: '...'
}
📥 [PROFILE_HANDLER] Processing profile event
📝 [PROFILE_HANDLER] Handling APPLICATION_UPDATED
✅ [PROFILE_HANDLER] Profile event processed successfully
```

### **Verify with RabbitMQ CLI:**

```bash
# Check exchange exists
rabbitmqctl list_exchanges | grep domain.events

# Check queue and bindings
rabbitmqctl list_queues | grep portal.profile.events
rabbitmqctl list_bindings | grep profile.service

# Expected binding:
# domain.events → portal.profile.events → profile.service.*
```

---

## ✅ Summary

**All functions required to publish `profile.service.application.updated` are present and properly configured:**

1. ✅ **Publishing Function Chain:** `publishDomainEvent()` → `publishEvent()` → RabbitMQ
2. ✅ **Exchange:** `domain.events` (asserted and ready)
3. ✅ **Routing Key:** `profile.service.application.updated`
4. ✅ **Payload Structure:** Properly wrapped with eventId, timestamp, metadata
5. ✅ **Error Handling:** Comprehensive try-catch and logging
6. ✅ **Persistence:** Messages are durable and persistent
7. ✅ **Internal Consumer:** Portal service can consume its own events (for logging/syncing)
8. ✅ **External Ready:** Profile service can bind to same exchange and consume

**No missing pieces!** The event will be successfully published when `publishDomainEvent()` is called.
