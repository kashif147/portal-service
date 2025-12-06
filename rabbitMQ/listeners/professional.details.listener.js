const ProfessionalDetails = require("../../models/professional.details.model");

/**
 * Handle work location updates coming from profile-service.
 * Event: members.professionaldetails.worklocation.updated.v1
 * Strategy: update by both userId and applicationId to ensure correct record is updated.
 * Since a user can have multiple applications, using only userId would update the wrong record.
 */
async function handleProfessionalWorkLocationUpdated(payload = {}) {
  const { userId, applicationId, workLocation, branch, region } = payload;

  if (!userId) {
    console.warn(
      "[PROFESSIONAL_WORK_LOCATION_UPDATED] Missing userId in payload, skipping"
    );
    return;
  }

  if (!applicationId) {
    console.warn(
      "[PROFESSIONAL_WORK_LOCATION_UPDATED] Missing applicationId in payload. " +
        "A user can have multiple applications, so applicationId is required to update the correct record. Skipping."
    );
    return;
  }

  try {
    const updateResult = await ProfessionalDetails.updateOne(
      { userId, applicationId },
      {
        $set: {
          "professionalDetails.workLocation": workLocation,
          "professionalDetails.branch": branch,
          "professionalDetails.region": region,
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      console.warn(
        `[PROFESSIONAL_WORK_LOCATION_UPDATED] No record found for userId: ${userId}, applicationId: ${applicationId}`
      );
    } else if (updateResult.modifiedCount === 0) {
      console.log(
        `[PROFESSIONAL_WORK_LOCATION_UPDATED] Record found but no changes made for userId: ${userId}, applicationId: ${applicationId}`
      );
    } else {
      console.log(
        `[PROFESSIONAL_WORK_LOCATION_UPDATED] Successfully updated professionalDetails for userId: ${userId}, applicationId: ${applicationId}`
      );
    }
  } catch (error) {
    console.error(
      "[PROFESSIONAL_WORK_LOCATION_UPDATED] Error updating professionalDetails:",
      {
        error: error.message,
        stack: error.stack,
        userId,
        applicationId,
      }
    );
    throw error;
  }
}

module.exports = {
  handleProfessionalWorkLocationUpdated,
};


