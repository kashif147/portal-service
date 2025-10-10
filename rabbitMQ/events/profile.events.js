const ProfileApplicationUpdateListener = require("../listeners/profileApplicationUpdateListener");
const ProfileMemberCreatedListener = require("../listeners/profileMemberCreatedListener");
const ProfileMemberUpdatedListener = require("../listeners/profileMemberUpdatedListener");

// Profile Events
const PROFILE_EVENTS = {
  APPLICATION_UPDATED: "profile.service.application.updated",
  MEMBER_CREATED: "profile.service.member.created",
  MEMBER_UPDATED: "profile.service.member.updated",
};

// Profile Queues
const PROFILE_QUEUES = {
  PROFILE_EVENTS: "portal.profile.events",
};

// Profile event handlers
async function handleProfileEvent(payload, routingKey, msg) {
  console.log("📥 [PROFILE_HANDLER] Processing profile event:", {
    routingKey,
    eventId: payload.eventId,
    eventType: payload.eventType,
    timestamp: new Date().toISOString(),
  });

  try {
    const { eventType, data } = payload;

    switch (eventType) {
      case PROFILE_EVENTS.APPLICATION_UPDATED:
        console.log("📝 [PROFILE_HANDLER] Handling APPLICATION_UPDATED");
        await ProfileApplicationUpdateListener.handleProfileApplicationUpdate(
          data
        );
        break;
      case PROFILE_EVENTS.MEMBER_CREATED:
        console.log("👤 [PROFILE_HANDLER] Handling MEMBER_CREATED");
        await ProfileMemberCreatedListener.handleProfileMemberCreated(data);
        break;
      case PROFILE_EVENTS.MEMBER_UPDATED:
        console.log("🔄 [PROFILE_HANDLER] Handling MEMBER_UPDATED");
        await ProfileMemberUpdatedListener.handleProfileMemberUpdated(data);
        break;
      default:
        console.warn(
          "⚠️ [PROFILE_HANDLER] Unknown profile event type:",
          eventType
        );
    }

    console.log("✅ [PROFILE_HANDLER] Profile event processed successfully:", {
      eventType,
      eventId: payload.eventId,
    });
  } catch (error) {
    console.error("❌ [PROFILE_HANDLER] Error handling profile event:", {
      error: error.message,
      stack: error.stack,
      eventType: payload?.eventType,
      eventId: payload?.eventId,
    });
    throw error;
  }
}

module.exports = {
  PROFILE_EVENTS,
  PROFILE_QUEUES,
  handleProfileEvent,
};
