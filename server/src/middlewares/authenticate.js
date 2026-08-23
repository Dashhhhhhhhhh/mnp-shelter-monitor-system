import { verifyToken } from "../utils/jwt.js";
import { findUserById } from "../modules/users/user.repository.js";

async function authenticate(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    const decoded = verifyToken(token);

    const user = await findUserById(decoded.userId);

    if (!user) {
      const error = new Error("User does not exist");
      error.statusCode = 401;
      throw error;
    }

    if (!user.is_active) {
      const error = new Error("User is deactivated");
      error.statusCode = 403;
      throw error;
    }

    req.user = {
      userId: user.user_id,
      firstName: user.first_name,
      middleInitial: user.middle_initial,
      lastName: user.last_name,
      email: user.email,
      contactNumber: user.contact_number,
      role: user.role_name,
    };

    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      const authError = new Error("Invalid or expired authentication token");
      authError.statusCode = 401;

      return next(authError);
    }

    next(error);
  }
}

export { authenticate };
