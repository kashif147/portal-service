const PersonalDetails = require("../models/personal.details.model");
const ProfessionalDetails = require("../models/professional.details.model");
const SubscriptionDetails = require("../models/subscription.model");
const { extractUserAndCreatorContext } = require("../helpers/get.user.info.js");
// const { emitApplicationApproved, emitApplicationRejected } = require("../events/applicationEvents");

exports.getAllApplications = async (req, res) => {
  try {
    // Check if user is CRM
    const { userType } = extractUserAndCreatorContext(req);
    if (userType !== "CRM") {
      return res.fail("Access denied. Only CRM user can view applications.");
    }

    // Get all personal details (applications)
    // const applications = await PersonalDetails.find({ "meta.deleted": false }).populate("userId", "name email").sort({ createdAt: -1 });
    const applications = await PersonalDetails.find().sort({ createdAt: -1 });

    // For each application, get professional and subscription details
    const applicationsWithDetails = await Promise.all(
      applications.map(async (application) => {
        try {
          // Get professional details
          const professionalDetails = await ProfessionalDetails.findOne({
            userId: application.userId,
            "meta.deleted": false,
          });

          // Get subscription details
          const subscriptionDetails = await SubscriptionDetails.findOne({
            userId: application.userId,
            "meta.deleted": false,
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
      applications: applicationsWithDetails,
      total: applicationsWithDetails.length,
    });
  } catch (error) {
    console.error("ApplicationController [getAllApplications] Error:", error);
    return res.serverError(error);
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    // Check if user is CRM
    const { userType } = extractUserAndCreatorContext(req);
    if (userType !== "CRM") {
      return res.fail("Access denied. Only CRM users can view applications.");
    }

    const { applicationId } = req.params;

    // Get personal details by application ID
    const personalDetails = await PersonalDetails.findOne({
      ApplicationId: applicationId,
      //   "meta.deleted": false,
    });

    if (!personalDetails) {
      return res.fail("Application not found");
    }

    // Get professional details
    const professionalDetails = await ProfessionalDetails.findOne({
      userId: personalDetails.userId,
      //   "meta.deleted": false,
    });

    // Get subscription details
    const subscriptionDetails = await SubscriptionDetails.findOne({
      userId: personalDetails.userId,
      //   "meta.deleted": false,
    });

    const applicationDetails = {
      applicationId: personalDetails.ApplicationId,
      userId: personalDetails.userId,
      personalDetails: personalDetails,
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
    const { comments, applicationStatus } = req.body;

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
    return res.serverError(error);
  }
};
