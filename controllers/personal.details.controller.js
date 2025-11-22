const personalDetailsService = require("../services/personal.details.service");
const personalDetailsHandler = require("../handlers/personal.details.handler");
const { extractUserAndCreatorContext } = require("../helpers/get.user.info.js");
const joischemas = require("../validation/index.js");
const { PolicyClient } = require("@membership/policy-middleware");
const { AppError } = require("../errors/AppError");

exports.createPersonalDetails = async (req, res, next) => {
  try {
    console.log("=== createPersonalDetails START ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const { userId, creatorId, userType } = extractUserAndCreatorContext(req);
    console.log("Extracted context:", { userId, creatorId, userType });

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
    console.log("Validation passed:", JSON.stringify(validatedData, null, 2));

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
        email
      );
      if (existingPersonalDetails) {
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
      const existingPersonalDetails = await personalDetailsHandler.getByUserId(
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

    console.log(
      "Calling personalDetailsService.createPersonalDetails with data:",
      {
        ...validatedData,
        userId,
        meta: { createdBy: creatorId, userType },
      }
    );

    const result = await personalDetailsService.createPersonalDetails({
      ...validatedData,
      userId,
      meta: { createdBy: creatorId, userType },
    });

    console.log("=== createPersonalDetails SUCCESS ===");
    return res.success(result);
  } catch (error) {
    console.error("=== createPersonalDetails ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error details:", JSON.stringify(error, null, 2));

    if (error.isJoi) {
      console.error("Joi validation error:", error.details);
      return next(AppError.badRequest("Validation error: " + error.message));
    }

    if (error.name === "ValidationError") {
      console.error("Mongoose validation error:", error.errors);
      return next(
        AppError.badRequest("Data validation error: " + error.message)
      );
    }

    if (error.code === 11000) {
      console.error("Duplicate key error:", error.keyValue);
      return next(
        AppError.conflict("Personal details already exist for this user")
      );
    }

    console.error("=== END ERROR ===");
    return next(error);
  }
};

exports.getPersonalDetails = async (req, res, next) => {
  try {
    const { userId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return next(AppError.badRequest("Application ID is required"));
    }

    const personalDetails = await personalDetailsService.getPersonalDetails(
      applicationId,
      userId,
      userType
    );
    
    if (!personalDetails) {
      return res.status(200).json({
        data: null,
        message: "Not found"
      });
    }
    
    return res.success(personalDetails);
  } catch (error) {
    console.error(
      "PersonalDetailsController [getPersonalDetails] Error:",
      error
    );
    if (error.message === "Personal details not found") {
      return res.status(200).json({
        data: null,
        message: "Not found"
      });
    }
    return next(error);
  }
};

exports.updatePersonalDetails = async (req, res, next) => {
  try {
    const { userId, userType, creatorId } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return next(AppError.badRequest("Application ID is required"));
    }

    const validatedData =
      await joischemas.personal_details_update.validateAsync(req.body);
    const updatePayload = {
      ...validatedData,
      meta: { updatedBy: creatorId, userType },
    };

    const result = await personalDetailsService.updatePersonalDetails(
      applicationId,
      updatePayload,
      userId,
      userType
    );

    return res.success(result);
  } catch (error) {
    console.error(
      "PersonalDetailsController [updatePersonalDetails] Error:",
      error
    );
    if (error.isJoi) {
      return next(AppError.badRequest("Validation error: " + error.message));
    }
    if (error.message === "Personal details not found") {
      return next(AppError.notFound("Personal details not found"));
    }
    return next(error);
  }
};

exports.deletePersonalDetails = async (req, res, next) => {
  try {
    const { userId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return next(AppError.badRequest("Application ID is required"));
    }

    await personalDetailsService.deletePersonalDetails(
      applicationId,
      userId,
      userType
    );

    return res.success("Personal details deleted successfully");
  } catch (error) {
    console.error(
      "PersonalDetailsController [deletePersonalDetails] Error:",
      error
    );
    if (error.message === "Personal details not found") {
      return next(AppError.notFound("Personal details not found"));
    }
    return next(error);
  }
};
exports.getMyPersonalDetails = async (req, res, next) => {
  try {
    console.log("=== getMyPersonalDetails START ===");
    console.log("Request headers:", req.headers);
    console.log("Request user:", req.user);
    console.log("Request ctx:", req.ctx);

    const { userId, userType } = extractUserAndCreatorContext(req);
    console.log("Extracted context:", { userId, userType });

    // Only allow PORTAL users to access this endpoint
    if (userType !== "PORTAL") {
      console.log("User type check failed:", userType);
      return next(AppError.forbidden("Access denied. Only for PORTAL users."));
    }

    if (!userId) {
      console.log("User ID check failed:", userId);
      console.log("req.user object:", JSON.stringify(req.user, null, 2));
      console.log("req.user.id:", req.user?.id);
      console.log("req.user._id:", req.user?._id);
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
      userId
    );
    console.log("Service response:", personalDetails);

    if (!personalDetails) {
      console.log("No personal details found for user:", userId);
      return res.status(200).json({
        data: null,
        message: "Not found"
      });
    }

    console.log("=== getMyPersonalDetails SUCCESS ===");
    return res.success(personalDetails);
  } catch (error) {
    console.error(
      "PersonalDetailsController [getMyPersonalDetails] Error:",
      error
    );
    console.error("Error stack:", error.stack);
    if (error.message === "Personal details not found") {
      return res.status(200).json({
        data: null,
        message: "Not found"
      });
    }
    return next(error);
  }
};

exports.getApplicationStatus = async (req, res, next) => {
  try {
    const { userId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return next(AppError.badRequest("Application ID is required"));
    }

    const applicationStatus = await personalDetailsService.getApplicationStatus(
      applicationId,
      userId,
      userType
    );

    return res.success({ applicationStatus });
  } catch (error) {
    console.error(
      "PersonalDetailsController [getApplicationStatus] Error:",
      error
    );
    if (error.message === "Personal details not found") {
      return res.status(200).json({
        data: null,
        message: "Not found"
      });
    }
    return next(error);
  }
};
