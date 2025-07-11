const PersonalDetails = require("../models/personal.details.model");

class PersonalDetailsService {
  // Create new personal details
  async createPersonalDetails(data) {
    try {
      // Calculate age from date of birth
      if (data.personalInfo && data.personalInfo.dateOfBirth) {
        const birthDate = new Date(data.personalInfo.dateOfBirth.split("/").reverse().join("-"));
        const today = new Date();
        data.personalInfo.age = today.getFullYear() - birthDate.getFullYear();
      }

      // Set creation timestamp
      if (data.meta) {
        data.meta.createdAt = new Date().toLocaleDateString("en-GB");
      }

      const personalDetails = new PersonalDetails(data);
      return await personalDetails.save();
    } catch (error) {
      throw new Error(`Error creating personal details: ${error.message}`);
    }
  }

  // Get personal details by ID
  async getPersonalDetailsById(id) {
    try {
      const personalDetails = await PersonalDetails.findById(id).populate(
        "userId",
        "userEmail userFullName userMemberNumber"
      );

      if (!personalDetails) {
        throw new Error("Personal details not found");
      }

      return personalDetails;
    } catch (error) {
      throw new Error(`Error fetching personal details: ${error.message}`);
    }
  }

  // Get personal details by user ID
  async getPersonalDetailsByUserId(userId) {
    try {
      const personalDetails = await PersonalDetails.findOne({ userId }).populate(
        "userId",
        "userEmail userFullName userMemberNumber"
      );

      if (!personalDetails) {
        throw new Error("Personal details not found for this user");
      }

      return personalDetails;
    } catch (error) {
      throw new Error(`Error fetching personal details: ${error.message}`);
    }
  }

  // Get all personal details (with pagination)
  async getAllPersonalDetails(page = 1, limit = 10, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const query = { "meta.deleted": false, "meta.isActive": true };

      // Add filters
      if (filters.gender) query["personalInfo.gender"] = filters.gender;
      if (filters.countryPrimaryQualification)
        query["personalInfo.countryPrimaryQualification"] = filters.countryPrimaryQualification;
      if (filters.deceased !== undefined) query["personalInfo.deceased"] = filters.deceased;

      const personalDetails = await PersonalDetails.find(query)
        .populate("userId", "userEmail userFullName userMemberNumber")
        .skip(skip)
        .limit(limit)
        .sort({ "meta.createdAt": -1 });

      const total = await PersonalDetails.countDocuments(query);

      return {
        data: personalDetails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error fetching personal details: ${error.message}`);
    }
  }

  // Update personal details
  async updatePersonalDetails(id, updateData) {
    try {
      // Calculate age if date of birth is being updated
      if (updateData.personalInfo && updateData.personalInfo.dateOfBirth) {
        const birthDate = new Date(updateData.personalInfo.dateOfBirth.split("/").reverse().join("-"));
        const today = new Date();
        updateData.personalInfo.age = today.getFullYear() - birthDate.getFullYear();
      }

      // Set update timestamp
      if (updateData.meta) {
        updateData.meta.updatedAt = new Date().toLocaleDateString("en-GB");
      } else {
        updateData.meta = { updatedAt: new Date().toLocaleDateString("en-GB") };
      }

      const personalDetails = await PersonalDetails.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate("userId", "userEmail userFullName userMemberNumber");

      if (!personalDetails) {
        throw new Error("Personal details not found");
      }

      return personalDetails;
    } catch (error) {
      throw new Error(`Error updating personal details: ${error.message}`);
    }
  }

  // Soft delete personal details
  async deletePersonalDetails(id) {
    try {
      const personalDetails = await PersonalDetails.findByIdAndUpdate(
        id,
        {
          "meta.deleted": true,
          "meta.isActive": false,
          "meta.updatedAt": new Date().toLocaleDateString("en-GB"),
        },
        { new: true }
      );

      if (!personalDetails) {
        throw new Error("Personal details not found");
      }

      return personalDetails;
    } catch (error) {
      throw new Error(`Error deleting personal details: ${error.message}`);
    }
  }

  // Restore personal details
  async restorePersonalDetails(id) {
    try {
      const personalDetails = await PersonalDetails.findByIdAndUpdate(
        id,
        {
          "meta.deleted": false,
          "meta.isActive": true,
          "meta.updatedAt": new Date().toLocaleDateString("en-GB"),
        },
        { new: true }
      );

      if (!personalDetails) {
        throw new Error("Personal details not found");
      }

      return personalDetails;
    } catch (error) {
      throw new Error(`Error restoring personal details: ${error.message}`);
    }
  }

  // Hard delete personal details
  async hardDeletePersonalDetails(id) {
    try {
      const personalDetails = await PersonalDetails.findByIdAndDelete(id);

      if (!personalDetails) {
        throw new Error("Personal details not found");
      }

      return { message: "Personal details permanently deleted" };
    } catch (error) {
      throw new Error(`Error deleting personal details: ${error.message}`);
    }
  }

  // Search personal details
  async searchPersonalDetails(searchTerm, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const query = {
        "meta.deleted": false,
        "meta.isActive": true,
        $or: [
          { "personalInfo.surname": { $regex: searchTerm, $options: "i" } },
          { "personalInfo.forename": { $regex: searchTerm, $options: "i" } },
          { "contactInfo.emailWork": { $regex: searchTerm, $options: "i" } },
          { "contactInfo.emailPersonal": { $regex: searchTerm, $options: "i" } },
          { "contactInfo.mobile": { $regex: searchTerm, $options: "i" } },
          { "nursingDetails.nmbiNo": { $regex: searchTerm, $options: "i" } },
        ],
      };

      const personalDetails = await PersonalDetails.find(query)
        .populate("userId", "userEmail userFullName userMemberNumber")
        .skip(skip)
        .limit(limit)
        .sort({ "meta.createdAt": -1 });

      const total = await PersonalDetails.countDocuments(query);

      return {
        data: personalDetails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error searching personal details: ${error.message}`);
    }
  }
}

module.exports = new PersonalDetailsService();
