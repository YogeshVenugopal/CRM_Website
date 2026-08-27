import AppError from '../utils/AppError.js';

/**
 * requirePermission — checks if authenticated user's role has the given permission(s).
 * Usage: requirePermission("lead:create")
 *        requirePermission("lead:create", "lead:update")
 */
export const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const userPermissions = req.user.role?.permissions || [];

    // Check wildcard: if user has "resource:*", they have all actions for that resource
    const hasPermission = requiredPermissions.every((required) => {
      if (userPermissions.includes(required)) return true;

      // Check wildcard: "resource:*"
      const [resource] = required.split(':');
      if (userPermissions.includes(`${resource}:*`)) return true;

      return false;
    });

    if (!hasPermission) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }

    next();
  };
};

/**
 * requireRole — checks if user's role name matches any of the allowed roles.
 * Usage: requireRole("admin", "management")
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const roleName = req.user.role?.name;
    if (!allowedRoles.includes(roleName)) {
      return next(new AppError('Insufficient role privileges', 403, 'FORBIDDEN'));
    }

    next();
  };
};

/**
 * assertOwnershipOrPrivileged — service-level ownership check.
 * Returns true if the user is the owner OR has a privileged role.
 *
 * Usage in service layer:
 *   assertOwnershipOrPrivileged(resource.assignedTo, req.user, ["admin", "management"]);
 */
export const assertOwnershipOrPrivileged = (resourceOwnerId, user, privilegedRoles = ['admin', 'management']) => {
  const roleName = user.role?.name;
  if (privilegedRoles.includes(roleName)) {
    return true;
  }
  return resourceOwnerId?.toString() === user._id?.toString();
};

export default requirePermission;
