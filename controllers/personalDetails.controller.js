const personalDetailsService = require("../services/personalDetails.service");

class PersonalDetailsController {
  async createPersonalDetails(req, res) {
    try {
      const personalDetails = await personalDetailsService.createPersonalDetails(req.body);

      return res.status(201).json({
        success: true,
        message: "Personal details created successfully",
        data: personalDetails,
      });
    } catch (error) {
      console.error("Create Personal Details Error:", error);
      return res.status(400).json({
        success: false,
        message: "Failed to create personal details",
        error: error.message,
      });
    }
  }

  async getPersonalDetailsById(req, res) {
    try {
      const { id } = req.params;
      const personalDetails = await personalDetailsService.getPersonalDetailsById(id);

      return res.status(200).json({
        success: true,
        message: "Personal details retrieved successfully",
        data: personalDetails,
      });
    } catch (error) {
      console.error("Get Personal Details Error:", error);
      return res.status(404).json({
        success: false,
        message: "Personal details not found",
        error: error.message,
      });
    }
  }

  async getPersonalDetailsByUserId(req, res) {
    try {
      const { userId } = req.params;
      const personalDetails = await personalDetailsService.getPersonalDetailsByUserId(userId);

      return res.status(200).json({
        success: true,
        message: "Personal details retrieved successfully",
        data: personalDetails,
      });
    } catch (error) {
      console.error("Get Personal Details by User ID Error:", error);
      return res.status(404).json({
        success: false,
        message: "Personal details not found for this user",
        error: error.message,
      });
    }
  }

  // Update personal details
  async updatePersonalDetails(req, res) {
    try {
      const { id } = req.params;
      const personalDetails = await personalDetailsService.updatePersonalDetails(id, req.body);

      return res.status(200).json({
        success: true,
        message: "Personal details updated successfully",
        data: personalDetails,
      });
    } catch (error) {
      console.error("Update Personal Details Error:", error);
      return res.status(400).json({
        success: false,
        message: "Failed to update personal details",
        error: error.message,
      });
    }
  }

  // Soft delete personal details
  async deletePersonalDetails(req, res) {
    try {
      const { id } = req.params;
      const personalDetails = await personalDetailsService.deletePersonalDetails(id);

      return res.status(200).json({
        success: true,
        message: "Personal details deleted successfully",
        data: personalDetails,
      });
    } catch (error) {
      console.error("Delete Personal Details Error:", error);
      return res.status(404).json({
        success: false,
        message: "Failed to delete personal details",
        error: error.message,
      });
    }
  }

  // Restore personal details
  async restorePersonalDetails(req, res) {
    try {
      const { id } = req.params;
      const personalDetails = await personalDetailsService.restorePersonalDetails(id);

      return res.status(200).json({
        success: true,
        message: "Personal details restored successfully",
        data: personalDetails,
      });
    } catch (error) {
      console.error("Restore Personal Details Error:", error);
      return res.status(404).json({
        success: false,
        message: "Failed to restore personal details",
        error: error.message,
      });
    }
  }

  // Hard delete personal details
  async hardDeletePersonalDetails(req, res) {
    try {
      const { id } = req.params;
      const result = await personalDetailsService.hardDeletePersonalDetails(id);

      return res.status(200).json({
        success: true,
        message: "Personal details permanently deleted",
        data: result,
      });
    } catch (error) {
      console.error("Hard Delete Personal Details Error:", error);
      return res.status(404).json({
        success: false,
        message: "Failed to delete personal details",
        error: error.message,
      });
    }
  }
}

module.exports = new PersonalDetailsController();
