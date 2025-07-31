const ProfessionalDetails = require("../models/professional.details.model");

class ProfessionalDetailsService {
  // Create new professional details
  async createProfessionalDetails(data) {
    try {
      // Set creation timestamp
      if (data.meta) {
        data.meta.createdAt = new Date().toLocaleDateString("en-GB");
      }

      const professionalDetails = new ProfessionalDetails(data);
      return await professionalDetails.save();
    } catch (error) {
      throw new Error(`Error creating professional details: ${error.message}`);
    }
  }

  // Get professional details by ID
  async getProfessionalDetailsById(id) {
    try {
      const professionalDetails = await ProfessionalDetails.findById(id);

      if (!professionalDetails) {
        throw new Error("Professional details not found");
      }

      return professionalDetails;
    } catch (error) {
      throw new Error(`Error fetching professional details: ${error.message}`);
    }
  }

  // Get professional details by profile ID
  async getProfessionalDetailsByProfileId(profileId) {
    try {
      const professionalDetails = await ProfessionalDetails.findOne({ profileId });

      if (!professionalDetails) {
        throw new Error("Professional details not found for this profile");
      }

      return professionalDetails;
    } catch (error) {
      throw new Error(`Error fetching professional details: ${error.message}`);
    }
  }

  // Get professional details by user ID
  async getProfessionalDetailsByUserId(userId) {
    try {
      const professionalDetails = await ProfessionalDetails.findOne({ userId });

      if (!professionalDetails) {
        throw new Error("Professional details not found for this user");
      }

      return professionalDetails;
    } catch (error) {
      throw new Error(`Error fetching professional details: ${error.message}`);
    }
  }

  // Get all professional details (with pagination)
  async getAllProfessionalDetails(page = 1, limit = 10, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const query = { "meta.deleted": false, "meta.isActive": true };

      // Add filters
      if (filters.grade) query["professionalDetails.grade"] = filters.grade;
      if (filters.workLocation) query["professionalDetails.workLocation"] = filters.workLocation;
      if (filters.regionId) query["professionalDetails.regionId"] = filters.regionId;
      if (filters.branchId) query["professionalDetails.branchId"] = filters.branchId;
      if (filters.primarySection) query["professionalDetails.primarySection"] = filters.primarySection;

      const professionalDetails = await ProfessionalDetails.find(query).skip(skip).limit(limit).sort({ "meta.createdAt": -1 });

      const total = await ProfessionalDetails.countDocuments(query);

      return {
        data: professionalDetails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error fetching professional details: ${error.message}`);
    }
  }

  // Update professional details
  async updateProfessionalDetails(id, updateData) {
    try {
      // Set update timestamp
      if (updateData.meta) {
        updateData.meta.updatedAt = new Date().toLocaleDateString("en-GB");
      } else {
        updateData.meta = { updatedAt: new Date().toLocaleDateString("en-GB") };
      }

      const professionalDetails = await ProfessionalDetails.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!professionalDetails) {
        throw new Error("Professional details not found");
      }

      return professionalDetails;
    } catch (error) {
      throw new Error(`Error updating professional details: ${error.message}`);
    }
  }

  // Soft delete professional details
  async deleteProfessionalDetails(id) {
    try {
      const professionalDetails = await ProfessionalDetails.findByIdAndUpdate(
        id,
        {
          "meta.deleted": true,
          "meta.isActive": false,
          "meta.updatedAt": new Date().toLocaleDateString("en-GB"),
        },
        { new: true }
      );

      if (!professionalDetails) {
        throw new Error("Professional details not found");
      }

      return professionalDetails;
    } catch (error) {
      throw new Error(`Error deleting professional details: ${error.message}`);
    }
  }

  // Restore professional details
  async restoreProfessionalDetails(id) {
    try {
      const professionalDetails = await ProfessionalDetails.findByIdAndUpdate(
        id,
        {
          "meta.deleted": false,
          "meta.isActive": true,
          "meta.updatedAt": new Date().toLocaleDateString("en-GB"),
        },
        { new: true }
      );

      if (!professionalDetails) {
        throw new Error("Professional details not found");
      }

      return professionalDetails;
    } catch (error) {
      throw new Error(`Error restoring professional details: ${error.message}`);
    }
  }

  // Hard delete professional details
  async hardDeleteProfessionalDetails(id) {
    try {
      const professionalDetails = await ProfessionalDetails.findByIdAndDelete(id);

      if (!professionalDetails) {
        throw new Error("Professional details not found");
      }

      return { message: "Professional details permanently deleted" };
    } catch (error) {
      throw new Error(`Error deleting professional details: ${error.message}`);
    }
  }

  // Search professional details
  async searchProfessionalDetails(searchTerm, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const query = {
        "meta.deleted": false,
        "meta.isActive": true,
        $or: [
          { "professionalDetails.grade": { $regex: searchTerm, $options: "i" } },
          { "professionalDetails.workLocation": { $regex: searchTerm, $options: "i" } },
          { "professionalDetails.otherWorkLocation": { $regex: searchTerm, $options: "i" } },
          { "professionalDetails.primarySection": { $regex: searchTerm, $options: "i" } },
          { "professionalDetails.secondarySection": { $regex: searchTerm, $options: "i" } },
          { "professionalDetails.pensionNo": { $regex: searchTerm, $options: "i" } },
          { "professionalDetails.studyLocation": { $regex: searchTerm, $options: "i" } },
        ],
      };

      const professionalDetails = await ProfessionalDetails.find(query).skip(skip).limit(limit).sort({ "meta.createdAt": -1 });

      const total = await ProfessionalDetails.countDocuments(query);

      return {
        data: professionalDetails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error searching professional details: ${error.message}`);
    }
  }

  // Get professional details by grade
  async getProfessionalDetailsByGrade(grade, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const query = {
        "meta.deleted": false,
        "meta.isActive": true,
        "professionalDetails.grade": grade,
      };

      const professionalDetails = await ProfessionalDetails.find(query).skip(skip).limit(limit).sort({ "meta.createdAt": -1 });

      const total = await ProfessionalDetails.countDocuments(query);

      return {
        data: professionalDetails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error fetching professional details by grade: ${error.message}`);
    }
  }

  // Get professional details by work location
  async getProfessionalDetailsByWorkLocation(workLocation, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const query = {
        "meta.deleted": false,
        "meta.isActive": true,
        $or: [{ "professionalDetails.workLocation": workLocation }, { "professionalDetails.otherWorkLocation": workLocation }],
      };

      const professionalDetails = await ProfessionalDetails.find(query).skip(skip).limit(limit).sort({ "meta.createdAt": -1 });

      const total = await ProfessionalDetails.countDocuments(query);

      return {
        data: professionalDetails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error fetching professional details by work location: ${error.message}`);
    }
  }
}

module.exports = new ProfessionalDetailsService();
