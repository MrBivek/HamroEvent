import { Router } from 'express';
import swaggerUI from 'swagger-ui-express';
import { authorize } from '../middlewares/rbac.js';
import { authenticateWithToken } from '../middlewares/auth.js';
import { handle404, handleError } from '../middlewares/errors.js';
import authRouter from './auth.js';
import userProfileRouter from './userprofile.js';
import rideRouter from './ride.js';
import driverRouter from './driver.js';
import itemRouter from './item.js';
import orderRouter from './order.js';
import rideHistoryRouter from './ridehistory.js';
import adminVerificationRouter from './adminverification.js';
import advertismentRouter from './advertisment.js';
import redeemPointsHistoryRouter from './redeempointshistory.js';
import subscriptionRouter from './subscription.js';
import adminRouter from "./admin.js";
import { checkFreeRides } from '../middlewares/checkRides.js';
import urls from '../urls.js';
import spec from '../openapi.js';

const router = Router();

// Swagger API docs
const swaggerSpecPath = `${urls.swagger.path}/${urls.swagger.spec}`;
const swaggerUIOptions = {
  swaggerOptions: {
    url: swaggerSpecPath
  }
};

router.get(swaggerSpecPath, (req, res) => res.json(spec));
router.use(
  urls.swagger.path,
  swaggerUI.serve,
  swaggerUI.setup(null, swaggerUIOptions)
);

// Authentication
router.use(urls.apiPrefix + urls.auth.path, authRouter);

//JWT Auth
router.use(authenticateWithToken);

// CRUD API with role-based permissions

// Admin: Full access
router.use(urls.apiPrefix + urls.adminVerification.path, authorize(), adminVerificationRouter);
router.use(urls.apiPrefix + urls.subscription.path, authorize(), subscriptionRouter);

// Normal, Premium, and Admin roles: Accessible routes
router.use(urls.apiPrefix + urls.userProfile.path, authorize(), userProfileRouter);
router.use(urls.apiPrefix + urls.rideHistory.path, authorize(), rideHistoryRouter);
router.use(urls.apiPrefix + urls.ride.path, authorize(), rideRouter);
router.use(urls.apiPrefix + urls.driver.path, authorize(), driverRouter);
router.use(urls.apiPrefix + urls.item.path, authorize(), itemRouter);
router.use(urls.apiPrefix + urls.order.path, authorize(), orderRouter);
router.use(urls.apiPrefix + urls.advertisment.path, authorize(), advertismentRouter);
router.use(urls.apiPrefix + urls.usersAll.path, authorize(), adminRouter);
// Driver and Admin roles: Redeem Points History
router.use(urls.apiPrefix + urls.redeemPointsHistory.path, authorize(), redeemPointsHistoryRouter);

// Redirect browsers from index to API docs
router.get('/', (req, res, next) => {
  if (req.accepts('text/html')) {
    res.redirect(urls.swagger.path);
  } else {
    next();
  }
});

// Error handlers
router.use(handle404);
router.use(handleError);

export default router;
