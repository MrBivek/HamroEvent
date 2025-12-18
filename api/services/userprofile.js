import UserProfile from "../models/userprofile.js";
import DatabaseError from "../models/error.js";

class UserProfileService {
  static async list() {
    try {
      return UserProfile.find();
    } catch (err) {
      throw new DatabaseError(err);
    }
  }

  static async get(id) {
    try {
      return await UserProfile.findOne({ _id: id }).exec();
    } catch (err) {
      throw new DatabaseError(err);
    }
  }

  static async getByUser(id) {
    try {
      return await UserProfile.findOne({ user: id }).exec();
    } catch (err) {
      throw new DatabaseError(err);
    }
  }

  static async create(data) {
    try {
      data.freeRidesRemaining = data.isPremium ? 3 : 1;

      const obj = new UserProfile(data);
      await obj.save();
      return obj;
    } catch (err) {
      throw new DatabaseError(err);
    }
  }

  static async update(id, data) {
    try {
      return await UserProfile.findOneAndUpdate(
        { _id: id },
        { $set: data },
        { new: true, upsert: false }
      );
    } catch (err) {
      throw new DatabaseError(err);
    }
  }

  static async delete(id) {
    try {
      const result = await UserProfile.deleteOne({ _id: id }).exec();
      return result.deletedCount === 1;
    } catch (err) {
      throw new DatabaseError(err);
    }
  }
}

export default UserProfileService;
