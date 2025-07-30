const { publishEvent } = require("message-bus");

// Application Approval Events
const emitApplicationApproved = async (data) => {
  try {
    await publishEvent("application.approved", {
      personalDetailsId: data.personalDetails._id,
      userId: data.personalDetails.userId,
      subscriptionDetails: data.subscriptionDetails,
      approvalDetails: data.approvalDetails,
      timestamp: new Date().toISOString(),
    });
    console.log("✅ Application Approved Event emitted:", data.personalDetails.ApplicationId);
  } catch (error) {
    console.error("❌ Error emitting Application Approved Event:", error.message);
  }
};

const emitApplicationRejected = async (data) => {
  try {
    await publishEvent("application.rejected", {
      personalDetailsId: data.personalDetails._id,
      userId: data.personalDetails.userId,
      approvalDetails: data.approvalDetails,
      timestamp: new Date().toISOString(),
    });
    console.log("✅ Application Rejected Event emitted:", data.personalDetails.ApplicationId);
  } catch (error) {
    console.error("❌ Error emitting Application Rejected Event:", error.message);
  }
};

module.exports = {
  emitApplicationApproved,
  emitApplicationRejected,
};
