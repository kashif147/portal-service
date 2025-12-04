const ProfessionalDetails = require("../../models/professional.details.model");

/**
 * Handle work location updates coming from profile-service.
 * Event: members.professionaldetails.worklocation.updated.v1
 * Strategy: keep it simple – update by userId only.
 */
async function handleProfessionalWorkLocationUpdated(payload = {}) {
  const { userId, workLocation, branch, region } = payload;

  if (!userId) {
    console.warn(
      "[PROFESSIONAL_WORK_LOCATION_UPDATED] Missing userId in payload, skipping"
    );
    return;
  }

  try {
    await ProfessionalDetails.updateOne(
      { userId },
      {
        $set: {
          "professionalDetails.workLocation": workLocation,
          "professionalDetails.branch": branch,
          "professionalDetails.region": region,
        },
      }
    );
    console.log(
      "[PROFESSIONAL_WORK_LOCATION_UPDATED] Updated professionalDetails for userId",
      String(userId)
    );
  } catch (error) {
    console.error(
      "[PROFESSIONAL_WORK_LOCATION_UPDATED] Error updating professionalDetails:",
      error.message
    );
  }
}

module.exports = {
  handleProfessionalWorkLocationUpdated,
};


