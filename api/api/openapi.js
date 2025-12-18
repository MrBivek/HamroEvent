import swaggerJsDoc from 'swagger-jsdoc';

import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  userSchema,
  verifySchema
} from './schemas/auth.js';
import userProfileSchema from './schemas/userprofile.js';
import rideSchema from './schemas/ride.js';
import driverSchema from './schemas/driver.js';
import rideHistorySchema from './schemas/ridehistory.js';
import adminVerificationSchema from './schemas/adminverification.js';
import advertisementSchema from './schemas/advertisement.js';
import redeemPointsHistorySchema from './schemas/redeempointshistory.js';
import subscriptionSchema from './schemas/subscription.js';

export const definition = {
    openapi: "3.0.0",
    info: {
      title: "EcoLift",
      version: "0.0.1",
      description: "Ride-hailing services in Express with 4 different user roles: Normal User, Premium User, Rider, Admin",
    },
    servers: [
      {
        url: "/api/v1",
        description: "API v1"
      }
    ],
    components: {
      schemas: {
        UserProfile: userProfileSchema,
        Ride: rideSchema,
        Driver: driverSchema,
        RideHistory: rideHistorySchema,
        AdminVerification: adminVerificationSchema,
        Advertisement: advertisementSchema,
        RedeemPointsHistory: redeemPointsHistorySchema,
        Subscription: subscriptionSchema,
        loginSchema,
        registerSchema,
        changePasswordSchema,
        verifySchema,
        User: userSchema,
      },
      securitySchemes: {
        BearerAuth: {
          type: "http",
          description: "JWT Authorization header using the Bearer scheme. Example: 'Authorization: Bearer {token}'",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
};

const options = {
  definition,
  apis: ['./src/api/routes/*.js'],
};

const spec = swaggerJsDoc(options);

export default spec;