const professionalDetailsHandler = require("../handlers/professional.details.handler");
const personalDetailsHandler = require("../handlers/personal.details.handler");
const subscriptionDetailsHandler = require("../handlers/subscription.details.handler");
const { AppError } = require("../errors/AppError");
const {
  requireTenantId,
  requirePortalUserId,
} = require("../helpers/tenantScope.js");
const {
  attachMembershipCategoryToProfessionalData,
  enrichProfessionalWithSubscriptionMembershipCategory,
  professionalPayloadIncludesMigratedFields,
  syncMembershipCategoryToSubscription,
} = require("../helpers/membershipCategory.helper.js");

async function clearLegacyProfessionalFieldsFromSubscription(
  tenantId,
  applicationId,
  professionalPayload = {},
) {
  if (!professionalPayloadIncludesMigratedFields(professionalPayload)) return;
  await subscriptionDetailsHandler.unsetLegacyProfessionalFieldsByApplicationId(
    tenantId,
    applicationId,
  );
}
const {
  isReapplyApplication,
  reactivatePersonalApplicationForReapply,
} = require("../helpers/reactivatePortalApplication.helper.js");

/**
 * Professional Details Service Layer
 * Contains business logic for professional details operations
 */
class ProfessionalDetailsService {
  /**
   * Create professional details
   * @param {Object} data - Professional details data
   * @param {string} applicationId - Application ID
   * @param {string} userId - User ID
   * @param {string} userType - User type (CRM/PORTAL)
   * @returns {Promise<Object>} Created professional details
   */
  async createProfessionalDetails(
    tenantId,
    data,
    applicationId,
    userId,
    userType,
    membershipCategory = null
  ) {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      if (userType !== "CRM") requirePortalUserId(userId);
      if (!data) {
        throw AppError.badRequest("Professional details data is required");
      }

      if (!applicationId) {
        throw AppError.badRequest("Application ID is required");
      }

      // Check if application exists (in the caller's tenant only)
      const personalDetails = await personalDetailsHandler.getApplicationById(
        scopedTenantId,
        applicationId
      );
      if (!personalDetails) {
        throw AppError.notFound("Application not found");
      }

      // Upsert: if professional details already exist for this application,
      // update them instead of returning 409 (handles re-apply and stale POSTs).
      const existingDetails =
        await professionalDetailsHandler.getByApplicationId(
          scopedTenantId,
          applicationId
        );
      if (existingDetails) {
        if (userType !== "CRM") {
          if (personalDetails.userId?.toString() !== userId?.toString()) {
            throw AppError.forbidden(
              "Access denied. You can only update professional details for your own applications."
            );
          }
        }

        if (isReapplyApplication(personalDetails)) {
          await reactivatePersonalApplicationForReapply(
            scopedTenantId,
            applicationId
          );
        }

        const updatePayload = attachMembershipCategoryToProfessionalData(
          {
            ...data,
            "meta.updatedBy": userId,
            "meta.userType": userType,
            "meta.isActive": true,
          },
          membershipCategory
        );

        const result = await professionalDetailsHandler.updateByApplicationId(
          scopedTenantId,
          applicationId,
          updatePayload
        );

        await syncMembershipCategoryToSubscription({
          tenantId: scopedTenantId,
          applicationId,
          membershipCategory,
          userId,
          userType,
          subscriptionDetailsHandler,
        });

        await clearLegacyProfessionalFieldsFromSubscription(
          scopedTenantId,
          applicationId,
          data?.professionalDetails,
        );

        return await enrichProfessionalWithSubscriptionMembershipCategory(
          result,
          await subscriptionDetailsHandler.getByApplicationId(
            scopedTenantId,
            applicationId
          ),
        );
      }

      // Validate user permissions for PORTAL users
      if (userType !== "CRM") {
        if (personalDetails.userId?.toString() !== userId?.toString()) {
          throw AppError.forbidden(
            "Access denied. You can only create professional details for your own applications."
          );
        }
      }

      const createData = attachMembershipCategoryToProfessionalData(
        {
          ...data,
          applicationId: applicationId,
          userId: userId,
          meta: { createdBy: userId, userType: userType },
        },
        membershipCategory
      );

      const result = await professionalDetailsHandler.create(
        scopedTenantId,
        createData
      );

      await syncMembershipCategoryToSubscription({
        tenantId: scopedTenantId,
        applicationId,
        membershipCategory,
        userId,
        userType,
        subscriptionDetailsHandler,
      });

      await clearLegacyProfessionalFieldsFromSubscription(
        scopedTenantId,
        applicationId,
        data?.professionalDetails,
      );

      return result;
    } catch (error) {
      console.error(
        "ProfessionalDetailsService [createProfessionalDetails] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Get professional details by application ID
   * @param {string} applicationId - Application ID
   * @param {string} userId - User ID (for authorization)
   * @param {string} userType - User type (CRM/PORTAL)
   * @returns {Promise<Object>} Professional details
   */
  async getProfessionalDetails(tenantId, applicationId, userId, userType) {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      if (userType !== "CRM") requirePortalUserId(userId);
      if (!applicationId) {
        throw AppError.badRequest("Application ID is required");
      }

      // Validate parent resource: check if application exists
      const personalDetails = await personalDetailsHandler.getApplicationById(
        scopedTenantId,
        applicationId
      );
      if (!personalDetails) {
        throw AppError.notFound("Application not found");
      }

      const professionalDetails =
        await professionalDetailsHandler.getByApplicationId(
          scopedTenantId,
          applicationId
        );
      
      // If application exists but professional details don't, return null (will be handled as 200 OK with null)
      if (!professionalDetails) {
        return null;
      }
      
      // Validate user permissions for PORTAL users
      if (userType !== "CRM") {
        if (!professionalDetails.userId || professionalDetails.userId.toString() !== userId?.toString()) {
          throw AppError.forbidden(
            "Access denied. You can only view professional details for your own applications."
          );
        }
      }

      const subscriptionDetails =
        await subscriptionDetailsHandler.getByApplicationId(
          scopedTenantId,
          applicationId
        );

      return await enrichProfessionalWithSubscriptionMembershipCategory(
        professionalDetails,
        subscriptionDetails,
      );
    } catch (error) {
      console.error(
        "ProfessionalDetailsService [getProfessionalDetails] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Update professional details
   * @param {string} applicationId - Application ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID (for authorization)
   * @param {string} userType - User type (CRM/PORTAL)
   * @returns {Promise<Object>} Updated professional details
   */
  async updateProfessionalDetails(
    tenantId,
    applicationId,
    updateData,
    userId,
    userType,
    membershipCategory = null
  ) {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      if (userType !== "CRM") requirePortalUserId(userId);
      if (!applicationId) {
        throw AppError.badRequest("Application ID is required");
      }

      if (!updateData) {
        throw AppError.badRequest("Update data is required");
      }

      const updatePayload = attachMembershipCategoryToProfessionalData(
        {
          ...updateData,
          "meta.updatedBy": userId,
          "meta.userType": userType,
        },
        membershipCategory
      );

      let result;
      if (userType === "CRM") {
        result = await professionalDetailsHandler.updateByApplicationId(
          scopedTenantId,
          applicationId,
          updatePayload
        );
      } else {
        result =
          await professionalDetailsHandler.updateByUserIdAndApplicationId(
            scopedTenantId,
            userId,
            applicationId,
            updatePayload
          );
      }

      await syncMembershipCategoryToSubscription({
        tenantId: scopedTenantId,
        applicationId,
        membershipCategory,
        userId,
        userType,
        subscriptionDetailsHandler,
      });

      await clearLegacyProfessionalFieldsFromSubscription(
        scopedTenantId,
        applicationId,
        updateData?.professionalDetails,
      );

      return await enrichProfessionalWithSubscriptionMembershipCategory(
        result,
        await subscriptionDetailsHandler.getByApplicationId(
          scopedTenantId,
          applicationId
        ),
      );
    } catch (error) {
      console.error(
        "ProfessionalDetailsService [updateProfessionalDetails] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Delete professional details
   * @param {string} applicationId - Application ID
   * @param {string} userId - User ID (for authorization)
   * @param {string} userType - User type (CRM/PORTAL)
   * @returns {Promise<Object>} Deleted professional details
   */
  async deleteProfessionalDetails(tenantId, applicationId, userId, userType) {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      if (!applicationId) {
        throw AppError.badRequest("Application ID is required");
      }

      let result;
      if (userType === "CRM") {
        result = await professionalDetailsHandler.deleteByApplicationId(
          scopedTenantId,
          applicationId
        );
      } else {
        result =
          await professionalDetailsHandler.deleteByUserIdAndApplicationId(
            scopedTenantId,
            requirePortalUserId(userId),
            applicationId
          );
      }

      return result;
    } catch (error) {
      console.error(
        "ProfessionalDetailsService [deleteProfessionalDetails] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Get professional details for portal user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Professional details
   */
  async getMyProfessionalDetails(tenantId, userId) {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      if (!userId) {
        throw AppError.badRequest("User ID is required");
      }

      const professionalDetails =
        await professionalDetailsHandler.getByUserId(scopedTenantId, userId);
      if (!professionalDetails) return null;

      const subscriptionDetails = professionalDetails.applicationId
        ? await subscriptionDetailsHandler.getByApplicationId(
            scopedTenantId,
            professionalDetails.applicationId
          )
        : null;

      return await enrichProfessionalWithSubscriptionMembershipCategory(
        professionalDetails,
        subscriptionDetails,
      );
    } catch (error) {
      console.error(
        "ProfessionalDetailsService [getMyProfessionalDetails] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Check if professional details exist for application
   * @param {string} applicationId - Application ID
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  async checkProfessionalDetailsExist(tenantId, applicationId) {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      if (!applicationId) {
        throw AppError.badRequest("Application ID is required");
      }

      const details = await professionalDetailsHandler.getByApplicationId(
        scopedTenantId,
        applicationId
      );
      return !!details;
    } catch (error) {
      console.error(
        "ProfessionalDetailsService [checkProfessionalDetailsExist] Error:",
        error
      );
      throw error;
    }
  }
}

module.exports = new ProfessionalDetailsService();
