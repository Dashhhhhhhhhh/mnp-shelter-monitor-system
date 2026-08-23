function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!allowedRoles.includes(req.user.role)) {
        const error = new Error(
          "You are not authorized to perform this action",
        );
        error.statusCode = 403;
        throw error;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export { authorizeRoles };
