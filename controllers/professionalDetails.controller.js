const professionalDetailsService = require("../services/professionalDetails.service");

class ProfessionalDetailsController {
  // Create new professional details
  async createProfessionalDetails(req, res) {
    try {
      const professionalDetails = await professionalDetailsService.createProfessionalDetails(req.body);

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

  // Get professional details by ID
  async getProfessionalDetailsById(req, res) {
    try {
      const { id } = req.params;
      const professionalDetails = await professionalDetailsService.getProfessionalDetailsById(id);

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

  // Get professional details by profile ID
  async getProfessionalDetailsByProfileId(req, res) {
    try {
      const { profileId } = req.params;
      const professionalDetails = await professionalDetailsService.getProfessionalDetailsByProfileId(profileId);

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

  // Update professional details
  async updateProfessionalDetails(req, res) {
    try {
      const { id } = req.params;
      const professionalDetails = await professionalDetailsService.updateProfessionalDetails(id, req.body);

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

  // Soft delete professional details
  async deleteProfessionalDetails(req, res) {
    try {
      const { id } = req.params;
      const professionalDetails = await professionalDetailsService.deleteProfessionalDetails(id);

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

  // Hard delete professional details
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
