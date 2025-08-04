const PersonalDetails = require("../models/personal.details.model");
const ProfessionalDetails = require("../models/professional.details.model");
const SubscriptionDetails = require("../models/subscription.model");
const { extractUserAndCreatorContext } = require("../helpers/get.user.info.js");
const joischemas = require("../validation/index.js");
// const { emitApplicationApproved, emitApplicationRejected } = require("../events/applicationEvents");

exports.getAllApplications = async (req, res) => {
  try {
    const { userType } = extractUserAndCreatorContext(req);
    if (userType !== "CRM") {
      return res.fail("Access denied. Only CRM user can view applications.");
    }

    const validatedQuery = await joischemas.application_status_query.validateAsync(req.query);

    let filter = {};
    if (validatedQuery.type) {
      if (Array.isArray(validatedQuery.type)) {
        filter.applicationStatus = { $in: validatedQuery.type };
      } else {
        filter.applicationStatus = validatedQuery.type;
      }
    }
    // If no type filter, get all applications

    const applications = await PersonalDetails.find(filter).sort({ createdAt: -1 });

    const applicationsWithDetails = await Promise.all(
      applications.map(async (application) => {
        try {
          const professionalDetails = await ProfessionalDetails.findOne({
            userId: application.userId,
          });

          const subscriptionDetails = await SubscriptionDetails.findOne({
            userId: application.userId,
          });

          return {
            ApplicationId: application.ApplicationId,
            userId: application.userId,
            personalDetails: application,
            professionalDetails: professionalDetails || null,
            subscriptionDetails: subscriptionDetails || null,
            applicationStatus: application.applicationStatus,
            approvalDetails: application.approvalDetails,
            createdAt: application.createdAt,
            updatedAt: application.updatedAt,
          };
        } catch (error) {
          console.error("Error fetching details for application:", error);
          return res.serverError(error);
        }
      })
    );

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

    const personalDetails = await PersonalDetails.findOne({
      ApplicationId: applicationId,
    });

    if (!personalDetails) {
      return res.fail("Application not found");
    }

    const professionalDetails = await ProfessionalDetails.findOne({
      userId: personalDetails.userId,
    });

    const subscriptionDetails = await SubscriptionDetails.findOne({
      userId: personalDetails.userId,
    });

    const applicationDetails = {
      applicationId: personalDetails.ApplicationId,
      userId: personalDetails.userId,
      personalDetails: personalDetails || null,
      professionalDetails: professionalDetails || null,
      subscriptionDetails: subscriptionDetails || null,
      applicationStatus: personalDetails.applicationStatus,
      approvalDetails: personalDetails.approvalDetails,
      createdAt: personalDetails.createdAt,
      updatedAt: personalDetails.updatedAt,
    };

    return res.success({
      message: "Application details retrieved successfully",
      data: applicationDetails,
    });
  } catch (error) {
    console.error("ApplicationController [getApplicationById] Error:", error);
    return res.serverError(error);
  }
};

exports.approveApplication = async (req, res) => {
  try {
    // Check if user is CRM
    const { userType, creatorId } = extractUserAndCreatorContext(req);
    if (userType !== "CRM") {
      return res.fail("Access denied. Only CRM users can approve applications.");
    }

    const { applicationId } = req.params;

    // Validate request body
    const validatedData = await joischemas.application_approve.validateAsync(req.body);
    const { comments, applicationStatus } = validatedData;

    // Use the CRM user's ID from token
    const approvedBy = creatorId;

    // Update personal details with approval
    const updatedApplication = await PersonalDetails.findOneAndUpdate(
      //   { ApplicationId: applicationId, "meta.deleted": false },
      { ApplicationId: applicationId },
      {
        applicationStatus: applicationStatus,
        approvalDetails: {
          approvedBy: approvedBy,
          approvedAt: new Date(),
          comments: comments || "",
        },
        "meta.updatedBy": approvedBy,
      },
      { new: true, runValidators: true }
    );

    if (!updatedApplication) {
      return res.fail("Application not found");
    }

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
    return res.serverError(error);
  }
};
