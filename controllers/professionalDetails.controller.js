const professionalDetailsService = require("../services/professionalDetails.service");

class ProfessionalDetailsController {
  async createProfessionalDetails(req, res) {
    try {
      // Extract user ID from JWT token
      const userId = req.user.id;

      const professionalDetailsData = {
        ...req.body,
        userId: userId,
      };

      const professionalDetails = await professionalDetailsService.createProfessionalDetails(professionalDetailsData);

      return res.status(201).json({
        success: true,
        message: "Professional details created successfully",
        data: professionalDetails,
      });
    } catch (error) {
      console.error("Create Professional Details Error:", error);
      return res.status(400).json({
        success: false,
        message: "Failed to create professional details",
        error: error.message,
      });
    }
  }
  //test
  async getProfessionalDetailsById(req, res) {
    try {
      // Extract user ID from JWT token
      const userId = req.user.id;

      // First get personal details to get the profileId
      const personalDetailsService = require("../services/personalDetails.service");
      const personalDetails = await personalDetailsService.getPersonalDetailsByUserId(userId);

      if (!personalDetails) {
        return res.status(404).json({
          success: false,
          message: "Personal details not found for this user",
        });
      }

      // Get professional details by profileId
      const professionalDetails = await professionalDetailsService.getProfessionalDetailsByProfileId(personalDetails._id);

      return res.status(200).json({
        success: true,
        message: "Professional details retrieved successfully",
        data: professionalDetails,
      });
    } catch (error) {
      console.error("Get Professional Details Error:", error);
      return res.status(404).json({
        success: false,
        message: "Professional details not found",
        error: error.message,
      });
    }
  }

  async getProfessionalDetailsByProfileId(req, res) {
    try {
      // Extract user ID from JWT token
      const userId = req.user.id;

      // First get personal details to get the profileId
      const personalDetailsService = require("../services/personalDetails.service");
      const personalDetails = await personalDetailsService.getPersonalDetailsByUserId(userId);

      if (!personalDetails) {
        return res.status(404).json({
          success: false,
          message: "Personal details not found for this user",
        });
      }

      // Get professional details by profileId
      const professionalDetails = await professionalDetailsService.getProfessionalDetailsByProfileId(personalDetails._id);

      return res.status(200).json({
        success: true,
        message: "Professional details retrieved successfully",
        data: professionalDetails,
      });
    } catch (error) {
      console.error("Get Professional Details by Profile ID Error:", error);
      return res.status(404).json({
        success: false,
        message: "Professional details not found for this profile",
        error: error.message,
      });
    }
  }

  async updateProfessionalDetails(req, res) {
    try {
      const userId = req.user.id;

      const existingDetails = await professionalDetailsService.getProfessionalDetailsByUserId(userId);

      if (!existingDetails) {
        return res.status(404).json({
          success: false,
          message: "Professional details not found for this user",
        });
      }

      const professionalDetails = await professionalDetailsService.updateProfessionalDetails(existingDetails._id, req.body);

      return res.status(200).json({
        success: true,
        message: "Professional details updated successfully",
        data: professionalDetails,
      });
    } catch (error) {
      console.error("Update Professional Details Error:", error);
      return res.status(400).json({
        success: false,
        message: "Failed to update professional details",
        error: error.message,
      });
    }
  }

  async deleteProfessionalDetails(req, res) {
    try {
      const userId = req.user.id;

      const existingDetails = await professionalDetailsService.getProfessionalDetailsByUserId(userId);

      if (!existingDetails) {
        return res.status(404).json({
          success: false,
          message: "Professional details not found for this user",
        });
      }

      const professionalDetails = await professionalDetailsService.deleteProfessionalDetails(existingDetails._id);

      return res.status(200).json({
        success: true,
        message: "Professional details deleted successfully",
        data: professionalDetails,
      });
    } catch (error) {
      console.error("Delete Professional Details Error:", error);
      return res.status(404).json({
        success: false,
        message: "Failed to delete professional details",
        error: error.message,
      });
    }
  }

  // Restore professional details
  async restoreProfessionalDetails(req, res) {
    try {
      const { id } = req.params;
      const professionalDetails = await professionalDetailsService.restoreProfessionalDetails(id);

      return res.status(200).json({
        success: true,
        message: "Professional details restored successfully",
        data: professionalDetails,
      });
    } catch (error) {
      console.error("Restore Professional Details Error:", error);
      return res.status(404).json({
        success: false,
        message: "Failed to restore professional details",
        error: error.message,
      });
    }
  }

  async hardDeleteProfessionalDetails(req, res) {
    try {
      const { id } = req.params;
      const result = await professionalDetailsService.hardDeleteProfessionalDetails(id);

      return res.status(200).json({
        success: true,
        message: "Professional details permanently deleted",
        data: result,
      });
    } catch (error) {
      console.error("Hard Delete Professional Details Error:", error);
      return res.status(404).json({
        success: false,
        message: "Failed to delete professional details",
        error: error.message,
      });
    }
  }
}

module.exports = new ProfessionalDetailsController();
