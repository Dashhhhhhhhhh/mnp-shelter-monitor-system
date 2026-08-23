import bcrypt from "bcrypt";
import { findUserByEmail } from "../users/user.repository.js";
import { generateToken } from "../../utils/jwt.js";

import { validateLoginInput } from "./auth.validation.js";

async function loginUser(userData) {
  const { email, password } = validateLoginInput(userData);

  const user = await findUserByEmail(email);

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (!user.is_active) {
    const error = new Error("Account inactive");
    error.statusCode = 403;
    throw error;
  }

  const token = generateToken({
    userId: user.user_id,
    role: user.role_name,
  });

  return {
    token,
    user: {
      userId: user.user_id,
      firstName: user.first_name,
      middleInitial: user.middle_initial,
      lastName: user.last_name,
      email: user.email,
      role: user.role_name,
    },
  };
}

export { loginUser };
