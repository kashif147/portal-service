const PersonalDetails = require("../models/personal.details.model");
const { APPLICATION_STATUS } = require("../constants/enums");

function isReapplyApplication(personalDetails) {
  if (!personalDetails) return false;
  return (
    personalDetails.applicationStatus === APPLICATION_STATUS.REJECTED ||
    personalDetails.meta?.isActive === false
  );
}

/**
 * Reset a rejected/inactive portal application to in-progress when the member
 * re-applies on the same applicationId (professional/subscription reactivation).
 */
async function reactivatePersonalApplicationForReapply(applicationId) {
  if (!applicationId) return null;

  const personal = await PersonalDetails.findOne({ applicationId });
  if (!personal) return null;

  const needsReactivation =
    personal.applicationStatus === APPLICATION_STATUS.REJECTED ||
    personal.meta?.isActive === false;

  if (!needsReactivation) {
    return personal;
  }

  return PersonalDetails.findByIdAndUpdate(
    personal._id,
    {
      $set: {
        applicationStatus: APPLICATION_STATUS.IN_PROGRESS,
        "meta.isActive": true,
      },
      $unset: {
        "approvalDetails.rejectionReason": "",
        "approvalDetails.comments": "",
      },
    },
    { new: true }
  );
}

module.exports = {
  isReapplyApplication,
  reactivatePersonalApplicationForReapply,
};
