const personalDetailsService = require("../services/personal.details.service");
const personalDetailsHandler = require("../handlers/personal.details.handler");
const { extractUserAndCreatorContext } = require("../helpers/get.user.info.js");
const joischemas = require("../validation/index.js");
const { PolicyClient } = require("@membership/policy-middleware");
const { AppError } = require("../errors/AppError");
const { getTrustedTenantId } = require("../helpers/tenantScope.js");
const {
  enrichPersonalInfoFullNameOnDocument,
} = require("../helpers/personal.info.fullName.js");

/*
 * Logging: ids, outcomes and error names/codes only. Request headers (Authorization, cookies),
 * bodies, validated data, req.user / req.ctx, personal-details records and whole error objects
 * are never logged - they carry tokens and personal data (email, names, DOB, address, mobile).
 * Validation/database errors log field names only: Joi details[].path, Mongoose
 * Object.keys(errors), duplicate key Object.keys(keyPattern). error.message is not logged where
 * it can embed values.
 */
function safeErrorFields(error) {
  const fields = { name: error?.name || null, code: error?.code ?? null };
  if (error?.isJoi && Array.isArray(error.details)) {
    fields.fields = error.details.map((d) => (Array.isArray(d.path) ? d.path.join(".") : String(d.path)));
  } else if (error?.name === "ValidationError" && error.errors && typeof error.errors === "object") {
    fields.fields = Object.keys(error.errors);
  } else if (error?.code === 11000) {
    fields.fields = Object.keys(error.keyPattern || {});
  }
  return fields;
}

function logError(operation, error, ids = {}) {
  console.error(`PersonalDetailsController [${operation}] Error:`, { ...ids, ...safeErrorFields(error) });
}

exports.createPersonalDetails = async (req, res, next) => {
  try {
    const tenantId = getTrustedTenantId(req);
    if (!tenantId) {
      return next(AppError.forbidden("Tenant context required"));
    }
    console.log("=== createPersonalDetails START ===");

    const { userId, creatorId, userType } = extractUserAndCreatorContext(req);
    console.log("Extracted context:", { tenantId, userId, creatorId, userType });

    if (!userId && userType !== "CRM") {
      console.log("User ID is missing in createPersonalDetails");
      return next(
        AppError.badRequest(
          "User ID is required. Please ensure you are properly authenticated."
        )
      );
    }

    const validatedData =
      await joischemas.personal_details_create.validateAsync(req.body);
    console.log("Validation passed");

    // Validate userType early to prevent invalid userTypes from bypassing duplicate checks
    if (!userType) {
      console.error("UserType is missing in request context");
      return next(
        AppError.badRequest(
          "User type is required. Please ensure authentication is valid."
        )
      );
    }

    if (userType !== "CRM" && userType !== "PORTAL") {
      console.error("Invalid userType:", userType);
      return next(
        AppError.badRequest(
          `Invalid user type: ${userType}. Expected PORTAL or CRM.`
        )
      );
    }

    // Perform duplicate check based on userType
    if (userType === "CRM") {
      const email =
        req.body.contactInfo?.personalEmail || req.body.contactInfo?.workEmail;
      if (!email) {
        return next(
          AppError.badRequest(
            "Email is required for CRM users to check for duplicates"
          )
        );
      }
      const existingPersonalDetails = await personalDetailsHandler.getByEmail(
        tenantId,
        email
      );
      const hasActiveApplication =
        existingPersonalDetails &&
        (existingPersonalDetails.meta?.isActive === undefined ||
          existingPersonalDetails.meta?.isActive === true);

      if (hasActiveApplication) {
        return next(
          AppError.conflict(
            "Personal details already exist, please update existing details"
          )
        );
      }
    } else if (userType === "PORTAL") {
      if (!userId) {
        return next(
          AppError.badRequest("User ID is required for portal users")
        );
      }
      const existingPersonalDetails =
        await personalDetailsHandler.getActiveByUserIdForPortal(
          tenantId,
          userId
        );

      if (existingPersonalDetails) {
        return next(
          AppError.conflict(
            "Personal details already exist, please update existing details"
          )
        );
      }
    }

    console.log("Calling personalDetailsService.createPersonalDetails", {
      tenantId,
      userId,
      userType,
    });

    const result = await personalDetailsService.createPersonalDetails(tenantId, {
      ...validatedData,
      userId,
      meta: {
        createdBy: creatorId,
        userType,
        deleted: false,
        isActive: true,
      },
    });

    console.log("=== createPersonalDetails SUCCESS ===", {
      tenantId,
      applicationId: result?.applicationId ?? null,
    });
    enrichPersonalInfoFullNameOnDocument(result);
    return res.success(result);
  } catch (error) {
    logError("createPersonalDetails", error);

    if (error.isJoi) {
      return next(AppError.badRequest("Validation error: " + error.message));
    }

    if (error.name === "ValidationError") {
      return next(
        AppError.badRequest("Data validation error: " + error.message)
      );
    }

    if (error.code === 11000) {
      return next(
        AppError.conflict("Personal details already exist for this user")
      );
    }

    return next(error);
  }
};

exports.getPersonalDetails = async (req, res, next) => {
  try {
    const tenantId = getTrustedTenantId(req);
    if (!tenantId) {
      return next(AppError.forbidden("Tenant context required"));
    }
    const { userId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return next(AppError.badRequest("Application ID is required"));
    }

    const personalDetails = await personalDetailsService.getPersonalDetails(
      tenantId,
      applicationId,
      userId,
      userType
    );
    
    if (!personalDetails) {
      return res.notFoundRecord("Personal details not found");
    }

    enrichPersonalInfoFullNameOnDocument(personalDetails);
    return res.success(personalDetails);
  } catch (error) {
    logError("getPersonalDetails", error);
    if (error.message === "Personal details not found") {
      return res.notFoundRecord("Personal details not found");
    }
    return next(error);
  }
};

exports.updatePersonalDetails = async (req, res, next) => {
  try {
    const tenantId = getTrustedTenantId(req);
    if (!tenantId) {
      return next(AppError.forbidden("Tenant context required"));
    }
    const { userId, userType, creatorId } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return next(AppError.badRequest("Application ID is required"));
    }

    const validatedData =
      await joischemas.personal_details_update.validateAsync(req.body);
    const updatePayload = {
      ...validatedData,
      "meta.updatedBy": creatorId,
      "meta.userType": userType,
    };

    const result = await personalDetailsService.updatePersonalDetails(
      tenantId,
      applicationId,
      updatePayload,
      userId,
      userType
    );

    enrichPersonalInfoFullNameOnDocument(result);
    return res.success(result);
  } catch (error) {
    logError("updatePersonalDetails", error);
    if (error.isJoi) {
      return next(AppError.badRequest("Validation error: " + error.message));
    }
    if (error.message === "Personal details not found") {
      return res.notFoundRecord("Personal details not found");
    }
    return next(error);
  }
};

exports.deletePersonalDetails = async (req, res, next) => {
  try {
    const tenantId = getTrustedTenantId(req);
    if (!tenantId) {
      return next(AppError.forbidden("Tenant context required"));
    }
    const { userId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return next(AppError.badRequest("Application ID is required"));
    }

    await personalDetailsService.deletePersonalDetails(
      tenantId,
      applicationId,
      userId,
      userType
    );

    return res.success("Personal details deleted successfully");
  } catch (error) {
    logError("deletePersonalDetails", error);
    if (error.message === "Personal details not found") {
      return res.notFoundRecord("Personal details not found");
    }
    return next(error);
  }
};
exports.getMyPersonalDetails = async (req, res, next) => {
  try {
    const tenantId = getTrustedTenantId(req);
    if (!tenantId) {
      return next(AppError.forbidden("Tenant context required"));
    }
    console.log("=== getMyPersonalDetails START ===");

    const { userId, userType } = extractUserAndCreatorContext(req);
    console.log("Extracted context:", { tenantId, userId, userType });

    // Only allow PORTAL users to access this endpoint
    if (userType !== "PORTAL") {
      console.log("User type check failed:", userType);
      return next(AppError.forbidden("Access denied. Only for PORTAL users."));
    }

    if (!userId) {
      console.log("User ID check failed: no userId in the authenticated context");
      return next(
        AppError.badRequest(
          "User ID is required. Please ensure you are properly authenticated."
        )
      );
    }

    console.log(
      "Calling personalDetailsService.getMyPersonalDetails with userId:",
      userId
    );
    const personalDetails = await personalDetailsService.getMyPersonalDetails(
      tenantId,
      userId
    );
    console.log("Service response:", { found: Boolean(personalDetails) });

    if (!personalDetails) {
      console.log("No personal details found for user:", userId);
      return res.notFoundRecord("Personal details not found");
    }

    enrichPersonalInfoFullNameOnDocument(personalDetails);
    console.log("=== getMyPersonalDetails SUCCESS ===");
    return res.success(personalDetails);
  } catch (error) {
    logError("getMyPersonalDetails", error, { tenantId: getTrustedTenantId(req) });
    if (error.message === "Personal details not found") {
      return res.notFoundRecord("Personal details not found");
    }
    return next(error);
  }
};

exports.getApplicationStatus = async (req, res, next) => {
  try {
    const tenantId = getTrustedTenantId(req);
    if (!tenantId) {
      return next(AppError.forbidden("Tenant context required"));
    }
    const { userId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return next(AppError.badRequest("Application ID is required"));
    }

    const statusPayload = await personalDetailsService.getApplicationStatus(
      tenantId,
      applicationId,
      userId,
      userType
    );

    return res.success(statusPayload);
  } catch (error) {
    logError("getApplicationStatus", error);
    if (error.message === "Personal details not found") {
      return res.notFoundRecord("Personal details not found");
    }
    return next(error);
  }
};
