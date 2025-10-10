# RabbitMQ Event Flow Fix - Summary

## Problem Identified

The portal service was **NOT receiving events** from the payment service because:

1. Payment service publishes to `accounts.events` exchange
2. Portal service was only listening to `domain.events` exchange
3. No queue binding existed for `accounts.events` → `application.status.updated`

## Solution Implemented

### 1. Enhanced Consumer (`consumer.js`)

**Changes:**

- Added exchange assertion for `accounts.events`
- Modified `createQueue()` to accept `exchangeName` parameter
- Enhanced logging with exchange, routing key, and event details
- Added structured error logging with stack traces

**Key Code:**

```javascript
// Assert both exchanges on initialization
await channel.assertExchange("domain.events", "topic", { durable: true });
await channel.assertExchange("accounts.events", "topic", { durable: true });

// Create queue with specific exchange binding
async function createQueue(queueName, exchangeName, routingKeys = [])
```

### 2. Added Payment Events Queue (`application.events.js`)

**Changes:**

- Added new queue: `portal.payment.events`

**Configuration:**

```javascript
const APPLICATION_QUEUES = {
  APPLICATION_PROCESSING: "portal.application.processing",
  PAYMENT_EVENTS: "portal.payment.events", // NEW
};
```

### 3. Updated Consumer Setup (`events.js`)

**Changes:**

- Set up two separate queues with different exchange bindings
- Added comprehensive logging for queue setup
- Enhanced error reporting

**Queue Configuration:**

```javascript
// Queue 1: Internal events (domain.events)
Queue: portal.application.processing
Exchange: domain.events
Routing Key: application.*

// Queue 2: Payment service events (accounts.events)
Queue: portal.payment.events
Exchange: accounts.events
Routing Key: application.status.updated
```

### 4. Enhanced Logging

**Publisher (`publisher.js`):**

```javascript
console.log("📤 [PUBLISHER] Publishing event:", {
  exchange: "domain.events",
  routingKey,
  eventId: payload.eventId,
  eventType: payload.eventType,
  timestamp: new Date().toISOString(),
});
```

**Consumer (`consumer.js`):**

```javascript
console.log("📥 [CONSUMER] Message received:", {
  queueName,
  exchange,
  routingKey,
  eventId: payload.eventId,
  eventType: payload.eventType,
  timestamp: new Date().toISOString(),
});
```

**Listener (`applicationStatusUpdateListener.js`):**

```javascript
console.log("📥 [STATUS_UPDATE_LISTENER] Received application status update:", {
  applicationId: data.applicationId,
  status: data.status,
  paymentIntentId: data.paymentIntentId,
  amount: data.amount,
  currency: data.currency,
  tenantId: data.tenantId,
  timestamp: new Date().toISOString(),
});
```

## Event Flow Architecture

### Before Fix

```
Payment Service
    ↓ publishes to
accounts.events → application.status.updated
    ↓
❌ NO QUEUE BOUND → Events lost
```

### After Fix

```
Payment Service
    ↓ publishes to
accounts.events → application.status.updated
    ↓ binds to
portal.payment.events queue
    ↓ consumed by
ApplicationStatusUpdateListener
    ↓ processes
Update application status → Emit to profile service
```

## Testing & Verification

### Expected Logs on Startup

```
✅ RabbitMQ consumer initialized
✅ Exchanges asserted: domain.events, accounts.events
🔧 Setting up RabbitMQ consumers...
✅ Queue bound: { queue: 'portal.application.processing', exchange: 'domain.events', routingKey: 'application.*' }
✅ Queue created: portal.application.processing
✅ Consumer started: portal.application.processing
✅ Internal application processing consumer ready: portal.application.processing
✅ Queue bound: { queue: 'portal.payment.events', exchange: 'accounts.events', routingKey: 'application.status.updated' }
✅ Queue created: portal.payment.events
✅ Consumer started: portal.payment.events
✅ Payment service events consumer ready: portal.payment.events
✅ Queue bound: { queue: 'portal.profile.events', exchange: 'domain.events', routingKey: 'profile.service.*' }
✅ Queue created: portal.profile.events
✅ Consumer started: portal.profile.events
✅ Profile service events consumer ready: portal.profile.events
✅ All consumers set up successfully
📊 Active queues: { internalQueue: 'portal.application.processing', paymentQueue: 'portal.payment.events', profileQueue: 'portal.profile.events' }
```

### Expected Logs When Payment Event Received

```
📥 [CONSUMER] Message received: {
  queueName: 'portal.payment.events',
  exchange: 'accounts.events',
  routingKey: 'application.status.updated',
  eventId: '1234567890-abc123',
  eventType: 'application.status.updated',
  timestamp: '2025-10-09T...'
}
📥 [STATUS_UPDATE_LISTENER] Received application status update: {
  applicationId: 'APP-123',
  status: 'paid',
  paymentIntentId: 'pi_xxx',
  amount: 5000,
  currency: 'USD',
  tenantId: 'tenant-123',
  timestamp: '2025-10-09T...'
}
✅ [STATUS_UPDATE_LISTENER] Found personal details: {
  id: '...',
  applicationId: 'APP-123',
  userId: 'user-123'
}
✅ [STATUS_UPDATE_LISTENER] Application status updated to: paid
✅ [STATUS_UPDATE_LISTENER] Payment information recorded in subscription details
📤 [STATUS_UPDATE_LISTENER] Emitting profile service event
📤 [DOMAIN EVENT] Publishing: {
  eventType: 'profile.service.application.updated',
  eventId: '...',
  dataKeys: ['applicationId', 'tenantId', 'status', ...],
  timestamp: '2025-10-09T...'
}
✅ [DOMAIN EVENT] Published successfully
✅ [STATUS_UPDATE_LISTENER] Profile service event emitted successfully
✅ [CONSUMER] Message processed successfully
```

## Payment Service Configuration Required

**Note:** This codebase is portal-service only. For payment service, ensure:

```javascript
// Payment service must publish to accounts.events
await channel.assertExchange("accounts.events", "topic", { durable: true });

// Publish event with correct routing key
await channel.publish(
  "accounts.events", // Exchange name
  "application.status.updated", // Routing key
  Buffer.from(
    JSON.stringify({
      eventId: generateEventId(),
      eventType: "application.status.updated",
      timestamp: new Date().toISOString(),
      data: {
        applicationId: "APP-123",
        status: "paid",
        paymentIntentId: "pi_xxx",
        amount: 5000,
        currency: "USD",
        tenantId: "tenant-123",
      },
      metadata: {
        service: "payment-service",
        version: "1.0",
      },
    })
  ),
  { persistent: true, contentType: "application/json" }
);
```

## Files Modified

1. `/rabbitMQ/consumer.js` - Exchange assertions, dynamic exchange binding, enhanced logging
2. `/rabbitMQ/publisher.js` - Enhanced logging with structured output
3. `/rabbitMQ/events.js` - Three-queue setup (added profile events), enhanced logging
4. `/rabbitMQ/events/application.events.js` - Added PAYMENT_EVENTS queue
5. `/rabbitMQ/events/profile.events.js` - Added PROFILE_QUEUES, enhanced logging
6. `/rabbitMQ/events/index.js` - Export PROFILE_QUEUES
7. `/rabbitMQ/listeners/applicationStatusUpdateListener.js` - Enhanced logging throughout

## Verification Commands

```bash
# Check RabbitMQ exchanges
rabbitmqctl list_exchanges

# Check queues
rabbitmqctl list_queues

# Check bindings
rabbitmqctl list_bindings

# Expected bindings:
# accounts.events → portal.payment.events (application.status.updated)
# domain.events → portal.application.processing (application.*)
```

## Troubleshooting

If events still not received:

1. **Check RabbitMQ logs** - Verify exchange exists
2. **Check queue bindings** - Run `rabbitmqctl list_bindings`
3. **Check payment service logs** - Verify it's publishing to `accounts.events`
4. **Check routing key** - Must be exactly `application.status.updated`
5. **Check payload structure** - Must include `eventId`, `eventType`, `data` fields
6. **Check network** - Both services can reach RabbitMQ broker
