import { Router } from "express";
import { authRoutes } from "./auth/auth.routes.js";
import {adminRoutes} from "./admin/admin.routes.js";
import { eventsRoutes } from "./events/events.routes.js";
import { vendorsRoutes } from "./vendors/vendors.routes.js";
import { bookingsRoutes } from "./bookings/bookings.routes.js";
import { packagesRoutes } from "./packages/packages.routes.js";
import { locationsRoutes } from "./locations/locations.routes.js";
import { categoriesRoutes } from "./categories/categories.routes.js";
import { vendorBookingsRoutes } from "./bookings/vendor-bookings.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/events", eventsRoutes);
apiRouter.use("/vendors", vendorsRoutes);
apiRouter.use("/vendors", packagesRoutes);
apiRouter.use("/bookings", bookingsRoutes);
apiRouter.use("/locations", locationsRoutes);
apiRouter.use("/categories", categoriesRoutes);
apiRouter.use("/vendors", vendorBookingsRoutes);