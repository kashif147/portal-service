const PersonalDetails = require("../models/personal.details.model");
const { APPLICATION_STATUS } = require("../constants/enums");
const { requireTenantId } = require("./tenantScope.js");

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
async function reactivatePersonalApplicationForReapply(tenantId, applicationId) {
  const scopedTenantId = requireTenantId(tenantId);
  if (!applicationId) return null;

  const personal = await PersonalDetails.findOne({
    tenantId: scopedTenantId,
    applicationId,
  });
  if (!personal) return null;

  const needsReactivation =
    personal.applicationStatus === APPLICATION_STATUS.REJECTED ||
    personal.meta?.isActive === false;

  if (!needsReactivation) {
    return personal;
  }

  return PersonalDetails.findOneAndUpdate(
    { _id: personal._id, tenantId: scopedTenantId },
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
