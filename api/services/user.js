import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/user.js';
import DatabaseError from '../models/error.js';
import { generatePasswordHash, validatePassword } from '../utils/password.js';
import nodemailer from 'nodemailer';
import DriverService from "./driver.js";
import AdminVerificationService from "./adminverification.js";
import UserProfile from "../models/userprofile.js";
import UserProfileService from "./userprofile.js";
import Driver from "../models/driver.js";

const generateRandomToken = () => randomBytes(48).toString('base64').replace(/[+/]/g, '.');
dotenv.config();

class UserService {
  static async list() {
    try {
      return User.find();
    } catch (err) {
      throw new DatabaseError(err);
    }
  }
  //   Generate JWT
  static generateToken(user) {
    return jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY }
    );
  }
  //   Generate JWT end
  static async get(id) {
    try {
      return User.findOne({ _id: id }).exec();
    } catch (err) {
      throw new DatabaseError(err);
    }
  }

  static async update(id, data) {
    try {
      return User.findOneAndUpdate({ _id: id }, data, { new: true, upsert: false });
    } catch (err) {
      throw new DatabaseError(err);
    }
  }

  static async delete(id) {
    try {
      const result = await User.deleteOne({ _id: id }).exec();
      return (result.deletedCount === 1);
    } catch (err) {
      throw new DatabaseError(err);
    }
  }
  
  static async checkIfUserIsApproved(userId) {
     const driver = await DriverService.getByUser(userId)
    if (!driver) {
      throw  new Error("User not found");
    }
    const verifiedDriver = await AdminVerificationService.getByDriver(driver._id);
    if(verifiedDriver == null){
      throw new Error("You are not verified driver yet. Please contact support team!!!")
    }
    const isAdminVerified = verifiedDriver?.status === "Approved"
     if(isAdminVerified) return;
    throw new Error("You are not verified driver yet. Please contact support team!!!")

  }

  static async authenticateWithPassword(email, password) {
    try {
      const user = await User.findOne({ email }).exec();
      if (!user) return null;
      if(user.role === 'Driver')
      {
        await this.checkIfUserIsApproved(user._id)
      }

      const passwordValid = await validatePassword(password, user.password);

      if (!passwordValid) return null;

      user.lastLoginAt = Date.now();
      const updatedUser = await user.save();
      return updatedUser;
    } catch (err) {
      throw new Error(err);
    }
  }

  static async authenticateWithToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return await User.findById(decoded.id).exec();
    } catch (err) {
      throw new DatabaseError(err);
    }
  }

  static async createUser({ password, ...userData }) {
    const hash = await generatePasswordHash(password);
    try {
      const validRoles = ['Normal', 'Premium', 'Driver', 'Admin'];
      if (!validRoles.includes(userData.role)) {
        console.log('Invalid role, defaulting to Normal'); // Log if role is invalid
        userData.role = 'Normal'; // Default to 'Normal' if invalid role
      }
      console.log('Creating user with data:', userData); // Log user data
      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const user = new User({
        ...userData,
        password: hash,
        verificationCode,
        isVerified: false
      });
      const token = UserService.generateToken(user);
      await user.save();

      await UserService.sendVerificationEmail(user.email, verificationCode);
      console.log('User created:', user); // Log after creation
      return {
        user: {
          ...user.toObject(),
          id: user._id.toString(), // Add this line to expose `id`
        },
        token };
    } catch (err) {
      console.error('Error in user creation:', err); // Log detailed error
      throw new DatabaseError(err);
    }
  }


  static async setPassword(user, password) {
    user.password = await generatePasswordHash(password); // eslint-disable-line

    try {
      if (!user.isNew) {
        await user.save();
      }

      return user;
    } catch (err) {
      throw new DatabaseError(err);
    }
  }
  static async sendVerificationEmail(email, code) {
    const transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASS
      }
    });

    const user = await User.findOne({ email });
    if (user) {
      user.verificationCode = code;
      await user.save();
    }
    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email,
      subject: 'Email Verification Code',
      text: `Your verification code is: ${code}`
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Verification email sent to:', email);
    } catch (error) {
      console.error('Error sending verification email:', error);
    }
  }

  static async verifyUser(email, code) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error('User not found');
      }

      console.log('Verification Code in DB:', user.verificationCode);
      console.log('Code from Request:', code);

      if (user.verificationCode === code) {
        user.isVerified = true;
        user.verificationCode = null;
        await  UserProfileService.create({user:user._id})
        await user.save();
        return { success: true, message: 'User verified successfully' };
      } else {
        return { success: false, message: 'Invalid verification code' };
      }
    } catch (err) {
      throw new DatabaseError(err);
    }
  }

  //   JWT Token Auth
  static async JWTauthenticateWithToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return await User.findOne({ _id: decoded.id }).exec();
    } catch (error) {
      return null;
    }
  }

  static async getAllUsersBasicInfo() {
    try {
      // Fetch users with only the needed fields: email, role, name
      const users = await User.find({}).exec();
      const userProfiles = await UserProfileService.list();
      const usersWithProfiles = [];

      for (const user of users) {
        const matchedProfile = userProfiles.find(profile => String(profile.user) === String(user._id));
        let driverProfile = null;

        if (user.role === "Driver") {
          try {
            driverProfile = await DriverService.getByUser(user._id);
          } catch (err) {
            console.error(`Error fetching driver profile for user ${user._id}:`, err);
          }
        }

        usersWithProfiles.push({
          ...user.toObject(),
          userProfile: matchedProfile ?? null,
          driverProfile: driverProfile ?? null,
        });
      }

      return usersWithProfiles;
    } catch (err) {
      throw new DatabaseError(err);
    }
  }


}

export default UserService;