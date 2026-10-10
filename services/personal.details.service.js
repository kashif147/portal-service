const personalDetailsHandler = require("../handlers/personal.details.handler");
const { AppError } = require("../errors/AppError");
const { APPLICATION_STATUS } = require("../constants/enums");
const {
  requireTenantId,
  requirePortalUserId,
} = require("../helpers/tenantScope.js");

/**
 * Personal Details Service Layer
 * Contains business logic for personal details operations
 */
class PersonalDetailsService {
  /**
   * Create personal details
   * @param {Object} data - Personal details data
   * @returns {Promise<Object>} Created personal details
   */
  async createPersonalDetails(tenantId, data) {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      if (!data) {
        throw AppError.badRequest("Personal details data is required");
      }

      return await personalDetailsHandler.create(scopedTenantId, data);
    } catch (error) {
      console.error(
        "PersonalDetailsService [createPersonalDetails] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Get personal details by application ID
   * @param {string} applicationId - Application ID
   * @param {string} userId - User ID (for authorization)
   * @param {string} userType - User type (CRM/PORTAL)
   * @returns {Promise<Object>} Personal details
   */
  async getPersonalDetails(tenantId, applicationId, userId, userType) {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      if (!applicationId) {
        throw AppError.badRequest("Application ID is required");
      }

      let personalDetails;
      if (userType === "CRM") {
        personalDetails = await personalDetailsHandler.getApplicationById(
          scopedTenantId,
          applicationId
        );
      } else {
        personalDetails =
          await personalDetailsHandler.getByUserIdAndApplicationId(
            scopedTenantId,
            requirePortalUserId(userId),
            applicationId
          );
      }

      if (!personalDetails) {
        throw new Error("Personal details not found");
      }

      return personalDetails;
    } catch (error) {
      console.error(
        "PersonalDetailsService [getPersonalDetails] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Update personal details
   * @param {string} applicationId - Application ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID (for authorization)
   * @param {string} userType - User type (CRM/PORTAL)
   * @returns {Promise<Object>} Updated personal details
   */
  async updatePersonalDetails(
    tenantId,
    applicationId,
    updateData,
    userId,
    userType
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

      // Ownership-scoped pre-read: a portal user only ever sees their own row.
      const existingPersonalDetails =
        userType === "CRM"
          ? await personalDetailsHandler.getApplicationById(
              scopedTenantId,
              applicationId
            )
          : await personalDetailsHandler.getByUserIdAndApplicationId(
              scopedTenantId,
              userId,
              applicationId
            );
      if (
        existingPersonalDetails &&
        (existingPersonalDetails.applicationStatus ===
          APPLICATION_STATUS.REJECTED ||
          existingPersonalDetails.meta?.isActive === false)
      ) {
        updateData.applicationStatus = APPLICATION_STATUS.IN_PROGRESS;
        updateData["meta.isActive"] = true;
      }

      let result;
      if (userType === "CRM") {
        result = await personalDetailsHandler.updateByApplicationId(
          scopedTenantId,
          applicationId,
          updateData
        );
      } else {
        result = await personalDetailsHandler.updateByUserIdAndApplicationId(
          scopedTenantId,
          userId,
          applicationId,
          updateData
        );
      }

      return result;
    } catch (error) {
      console.error(
        "PersonalDetailsService [updatePersonalDetails] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Delete personal details
   * @param {string} applicationId - Application ID
   * @param {string} userId - User ID (for authorization)
   * @param {string} userType - User type (CRM/PORTAL)
   * @returns {Promise<Object>} Deleted personal details
   */
  async deletePersonalDetails(tenantId, applicationId, userId, userType) {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      if (!applicationId) {
        throw AppError.badRequest("Application ID is required");
      }

      let result;
      if (userType === "CRM") {
        result = await personalDetailsHandler.deleteByApplicationId(
          scopedTenantId,
          applicationId
        );
      } else {
        result = await personalDetailsHandler.deleteByUserIdAndApplicationId(
          scopedTenantId,
          requirePortalUserId(userId),
          applicationId
        );
      }

      return result;
    } catch (error) {
      console.error(
        "PersonalDetailsService [deletePersonalDetails] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Get personal details for portal user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Personal details
   */
  async getMyPersonalDetails(tenantId, userId) {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      if (!userId) {
        throw AppError.badRequest("User ID is required");
      }

      return await personalDetailsHandler.getByUserIdForPortal(
        scopedTenantId,
        userId
      );
    } catch (error) {
      console.error(
        "PersonalDetailsService [getMyPersonalDetails] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Check if personal details exist for user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  async checkPersonalDetailsExist(tenantId, userId) {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      if (!userId) {
        throw AppError.badRequest("User ID is required");
      }

      const details = await personalDetailsHandler.getByUserId(
        scopedTenantId,
        userId
      );
      return !!details;
    } catch (error) {
      console.error(
        "PersonalDetailsService [checkPersonalDetailsExist] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Get application status by application ID
   * @param {string} applicationId - Application ID
   * @param {string} userId - User ID (for authorization)
   * @param {string} userType - User type (CRM/PORTAL)
   * @returns {Promise<{ applicationStatus: string, meta: { isActive: boolean } }>}
   */
  async getApplicationStatus(tenantId, applicationId, userId, userType) {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      if (!applicationId) {
        throw AppError.badRequest("Application ID is required");
      }

      let personalDetails;
      if (userType === "CRM") {
        personalDetails = await personalDetailsHandler.getApplicationById(
          scopedTenantId,
          applicationId
        );
      } else {
        personalDetails =
          await personalDetailsHandler.getByUserIdAndApplicationId(
            scopedTenantId,
            requirePortalUserId(userId),
            applicationId
          );
      }

      if (!personalDetails) {
        throw new Error("Personal details not found");
      }

      const isActive =
        personalDetails.meta?.isActive !== undefined
          ? personalDetails.meta.isActive
          : true;

      return {
        applicationStatus: personalDetails.applicationStatus,
        meta: { isActive },
      };
    } catch (error) {
      console.error(
        "PersonalDetailsService [getApplicationStatus] Error:",
        error
      );
      throw error;
    }
  }
}

module.exports = new PersonalDetailsService();
