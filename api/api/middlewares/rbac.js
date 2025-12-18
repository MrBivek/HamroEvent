import { ForbiddenError } from "./errors.js"; // You can define a custom error class for Forbidden

const permissions = {
  Normal: [
    "user-profile:post",
    "ride-history:get",
    "ride:post",
    "ride:put",
    "ride:get",
    "driver:get",
    "advertisement:get",
    "*",
  ],
  Premium: [
    "user-profile:post",
    "ride-history:get",
    "ride:post",
    "ride:get",
    "ride:put",
    "driver:get",
    "advertisement:get",
    "*",
  ],
  Driver: [
    "user-profile:post",
    "ride-history:get",
    "ride:post",
    "ride:put",
    "ride:get",
    "driver:get",
    "driver:post",
    "advertisement:get",
    "redeempoints-history:get",
    "*",
    "item:post"
  ],
  Admin: ["*"], // Full access
};

export function authorize() {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole) {
      return res.status(401).json({ error: "Unauthorized: No user role" });
    }

    const allowedPermissions = permissions[userRole] || [];

    // Extract resource from request URL (assumes API follows "/api/v1/resource-name")
    const resourceMatch = req.originalUrl.match(/\/api\/v\d+\/([^/?]+)/);
    const resource = resourceMatch ? resourceMatch[1] : null;

    if (!resource) {
      return res
        .status(400)
        .json({ error: "Bad Request: Unable to determine resource" });
    }

    // Map HTTP methods to permission strings dynamically
    const methodPermission = `${resource}:${req.method.toLowerCase()}`;

    if (
      allowedPermissions.includes("*") ||
      allowedPermissions.includes(methodPermission)
    ) {
      return next();
    }

    return res.status(403).json({
      error: "Forbidden: You do not have permission to access this resource",
    });
  };
}
