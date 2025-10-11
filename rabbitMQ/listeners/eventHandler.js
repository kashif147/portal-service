const ApplicationStatusUpdateListener = require("./application.status.submitted.listener.js");

// Route incoming events to appropriate listeners
// This is a thin routing layer - consumer.js handles technical logging/ACK/NACK
// Listeners handle business logic and business-specific logging
async function handleApplicationStatusUpdate(payload, routingKey, msg) {
  const { data } = payload;
  await ApplicationStatusUpdateListener.handleApplicationStatusUpdate(data);
}

module.exports = {
  handleApplicationStatusUpdate,
};
