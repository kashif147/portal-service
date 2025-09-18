const applicationHandler = require("../handlers/application.handler");
const { extractUserAndCreatorContext } = require("../helpers/get.user.info.js");
const joischemas = require("../validation/index.js");
const policyClient = require("../utils/policyClient");
const { AppError } = require("../errors/AppError");
// const { emitApplicationApproved, emitApplicationRejected } = require("../events/applicationEvents");

exports.getAllApplications = async (req, res) => {
  try {
    const { userType } = extractUserAndCreatorContext(req);
    if (userType !== "CRM") {
      return res.fail("Access denied. Only CRM user can view applications.");
    }

    const validatedQuery =
      await joischemas.application_status_query.validateAsync(req.query);

    let statusFilters = [];
    if (validatedQuery.type) {
      if (Array.isArray(validatedQuery.type)) {
        statusFilters = validatedQuery.type;
      } else {
        statusFilters = [validatedQuery.type];
      }
    }

    const applicationsWithDetails =
      await applicationHandler.getAllApplicationsWithDetails(statusFilters);

    return res.success({
      filter: validatedQuery.type || "all",
      total: applicationsWithDetails.length,
      applications: applicationsWithDetails,
    });
  } catch (error) {
    console.error("ApplicationController [getAllApplications] Error:", error);
    if (error.isJoi) {
      return res.fail("Validation error: " + error.message);
    }
    return res.serverError(error);
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    const { userType } = extractUserAndCreatorContext(req);
    if (userType !== "CRM") {
      return res.fail("Access denied. Only CRM users can view applications.");
    }
    const { applicationId } = req.params;

    const applicationDetails =
      await applicationHandler.getApplicationWithDetails(applicationId);
    return res.success(applicationDetails);
  } catch (error) {
    console.error("ApplicationController [getApplicationById] Error:", error);
    if (error.message === "Application not found") {
      return res.fail(error.message);
    }
    return res.serverError(error);
  }
};

exports.approveApplication = async (req, res) => {
  try {
    // Check if user is CRM
    const { userType, creatorId } = extractUserAndCreatorContext(req);
    if (userType !== "CRM") {
      return res.fail(
        "Access denied. Only CRM users can approve applications."
      );
    }

    const { applicationId } = req.params;

    // Validate request body
    const validatedData = await joischemas.application_approve.validateAsync(
      req.body
    );
    const { comments, applicationStatus } = validatedData;

    // Use the new application handler
    const updatedApplication = await applicationHandler.updateApplicationStatus(
      applicationId,
      applicationStatus,
      creatorId,
      comments
    );

    // // Get subscription details for the user
    // const subscriptionDetails = await SubscriptionDetails.findOne({
    //   userId: updatedApplication.userId,
    //   "meta.deleted": false,
    // });

    // // Prepare event data
    // const eventData = {
    //   personalDetails: updatedApplication,
    //   subscriptionDetails: subscriptionDetails,
    //   approvalDetails: updatedApplication.approvalDetails,
    // };

    // // Emit appropriate event based on status
    // if (applicationStatus === "approved") {
    //   await emitApplicationApproved(eventData);
    // } else if (applicationStatus === "rejected") {
    //   await emitApplicationRejected(eventData);
    // }

    return res.success({
      applicationId: updatedApplication.ApplicationId,
      applicationStatus: updatedApplication.applicationStatus,
      approvalDetails: updatedApplication.approvalDetails,
    });
  } catch (error) {
    console.error("ApplicationController [approveApplication] Error:", error);
    if (error.isJoi) {
      return res.fail("Validation error: " + error.message);
    }
    if (error.message.includes("Invalid status")) {
      return res.fail(error.message);
    }
    if (error.message.includes("Application not found")) {
      return res.fail(error.message);
    }
    return res.serverError(error);
  }
};
