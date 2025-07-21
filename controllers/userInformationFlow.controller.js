const personalDetailsService = require("../services/personalDetails.service");
const professionalDetailsService = require("../services/professionalDetails.service");
const subscriptionService = require("../services/subscription.service");
const {
  emitPersonalDetailsCreated,
  emitPersonalDetailsUpdated,
  emitProfessionalDetailsCreated,
  emitProfessionalDetailsUpdated,
  emitSubscriptionDetailsCreated,
  emitSubscriptionDetailsUpdated,
  emitUserInformationSubmitted,
  emitUserInformationUpdated
} = require("../events/userInformationEvents");

class UserInformationFlowController {
  // Handle complete user information submission
  async submitUserInformation(req, res) {
    try {
      const { personalDetails, professionalDetails, subscriptionDetails } = req.body;
      const userId = req.user.id; // From JWT token

      const results = {
        personalDetails: null,
        professionalDetails: null,
        subscriptionDetails: null,
        errors: []
      };

      // Step 1: Create Personal Details
      if (personalDetails) {
        try {
          const personalData = {
            ...personalDetails,
            userId: userId
          };
          results.personalDetails = await personalDetailsService.createPersonalDetails(personalData);
          
          // Emit event for personal details created
          await emitPersonalDetailsCreated(results.personalDetails);
        } catch (error) {
          results.errors.push(`Personal Details Error: ${error.message}`);
        }
      }

      // Step 2: Create Professional Details (requires personal details ID)
      if (professionalDetails && results.personalDetails) {
        try {
          const professionalData = {
            ...professionalDetails,
            profileId: results.personalDetails._id
          };
          results.professionalDetails = await professionalDetailsService.createProfessionalDetails(professionalData);
          
          // Emit event for professional details created
          await emitProfessionalDetailsCreated(results.professionalDetails);
        } catch (error) {
          results.errors.push(`Professional Details Error: ${error.message}`);
        }
      }

      // Step 3: Create Subscription Details (requires personal details ID)
      if (subscriptionDetails && results.personalDetails) {
        try {
          const subscriptionData = {
            ...subscriptionDetails,
            profileId: results.personalDetails._id
          };
          results.subscriptionDetails = await subscriptionService.createSubscription(subscriptionData);
          
          // Emit event for subscription details created
          await emitSubscriptionDetailsCreated(results.subscriptionDetails);
        } catch (error) {
          results.errors.push(`Subscription Details Error: ${error.message}`);
        }
      }

      // Check if any errors occurred
      if (results.errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Some information could not be saved",
          data: results,
          errors: results.errors
        });
      }

      // Emit complete user information submitted event
      await emitUserInformationSubmitted(results);

      return res.status(201).json({
        success: true,
        message: "User information submitted successfully",
        data: results
      });

    } catch (error) {
      console.error("User Information Flow Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to submit user information",
        error: error.message
      });
    }
  }

  // Get complete user information
  async getUserInformation(req, res) {
    try {
      const userId = req.user.id;
      
      const results = {
        personalDetails: null,
        professionalDetails: null,
        subscriptionDetails: null
      };

      // Get Personal Details
      try {
        results.personalDetails = await personalDetailsService.getPersonalDetailsByUserId(userId);
      } catch (error) {
        console.log("No personal details found for user");
      }

      // Get Professional Details if personal details exist
      if (results.personalDetails) {
        try {
          results.professionalDetails = await professionalDetailsService.getProfessionalDetailsByProfileId(results.personalDetails._id);
        } catch (error) {
          console.log("No professional details found for user");
        }

        // Get Subscription Details
        try {
          results.subscriptionDetails = await subscriptionService.getSubscriptionByProfileId(results.personalDetails._id);
        } catch (error) {
          console.log("No subscription details found for user");
        }
      }

      return res.status(200).json({
        success: true,
        message: "User information retrieved successfully",
        data: results
      });

    } catch (error) {
      console.error("Get User Information Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve user information",
        error: error.message
      });
    }
  }

  // Update user information
  async updateUserInformation(req, res) {
    try {
      const { personalDetails, professionalDetails, subscriptionDetails } = req.body;
      const userId = req.user.id;

      const results = {
        personalDetails: null,
        professionalDetails: null,
        subscriptionDetails: null,
        errors: []
      };

      // Update Personal Details
      if (personalDetails) {
        try {
          const existingPersonal = await personalDetailsService.getPersonalDetailsByUserId(userId);
          if (existingPersonal) {
            results.personalDetails = await personalDetailsService.updatePersonalDetails(existingPersonal._id, personalDetails);
            // Emit event for personal details updated
            await emitPersonalDetailsUpdated(results.personalDetails);
          } else {
            // Create if doesn't exist
            const personalData = {
              ...personalDetails,
              userId: userId
            };
            results.personalDetails = await personalDetailsService.createPersonalDetails(personalData);
            // Emit event for personal details created
            await emitPersonalDetailsCreated(results.personalDetails);
          }
        } catch (error) {
          results.errors.push(`Personal Details Error: ${error.message}`);
        }
      }

      // Update Professional Details
      if (professionalDetails && results.personalDetails) {
        try {
          const existingProfessional = await professionalDetailsService.getProfessionalDetailsByProfileId(results.personalDetails._id);
          if (existingProfessional) {
            results.professionalDetails = await professionalDetailsService.updateProfessionalDetails(existingProfessional._id, professionalDetails);
            // Emit event for professional details updated
            await emitProfessionalDetailsUpdated(results.professionalDetails);
          } else {
            // Create if doesn't exist
            const professionalData = {
              ...professionalDetails,
              profileId: results.personalDetails._id
            };
            results.professionalDetails = await professionalDetailsService.createProfessionalDetails(professionalData);
            // Emit event for professional details created
            await emitProfessionalDetailsCreated(results.professionalDetails);
          }
        } catch (error) {
          results.errors.push(`Professional Details Error: ${error.message}`);
        }
      }

      // Update Subscription Details
      if (subscriptionDetails && results.personalDetails) {
        try {
          const existingSubscription = await subscriptionService.getSubscriptionByProfileId(results.personalDetails._id);
          if (existingSubscription) {
            results.subscriptionDetails = await subscriptionService.updateSubscription(existingSubscription._id, subscriptionDetails);
            // Emit event for subscription details updated
            await emitSubscriptionDetailsUpdated(results.subscriptionDetails);
          } else {
            // Create if doesn't exist
            const subscriptionData = {
              ...subscriptionDetails,
              profileId: results.personalDetails._id
            };
            results.subscriptionDetails = await subscriptionService.createSubscription(subscriptionData);
            // Emit event for subscription details created
            await emitSubscriptionDetailsCreated(results.subscriptionDetails);
          }
        } catch (error) {
          results.errors.push(`Subscription Details Error: ${error.message}`);
        }
      }

      // Check if any errors occurred
      if (results.errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Some information could not be updated",
          data: results,
          errors: results.errors
        });
      }

      // Emit complete user information updated event
      await emitUserInformationUpdated(results);

      return res.status(200).json({
        success: true,
        message: "User information updated successfully",
        data: results
      });

    } catch (error) {
      console.error("Update User Information Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update user information",
        error: error.message
      });
    }
  }
}

module.exports = new UserInformationFlowController(); 