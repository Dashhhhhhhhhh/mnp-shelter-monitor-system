import bcrypt from "bcrypt";

import {
  findRoleByName,
  findUserByEmail,
  createUser,
  findUserById,
} from "./user.repository.js";
import { validateCreateUserInput } from "./user.validation.js";

async function createUserService(userData) {
  const {
    role,
    firstName,
    middleInitial,
    lastName,
    email,
    password,
    contactNumber,
  } = validateCreateUserInput(userData);

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    const error = new Error("Email is already in use");
    error.statusCode = 409;
    throw error;
  }

  const roleRecord = await findRoleByName(role);

  if (!roleRecord) {
    const error = new Error("Invalid role");
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await createUser({
    roleId: roleRecord.role_id,
    firstName,
    middleInitial,
    lastName,
    email,
    passwordHash,
    contactNumber,
  });

  return {
    userId: createdUser.user_id,
    firstName: createdUser.first_name,
    middleInitial: createdUser.middle_initial,
    lastName: createdUser.last_name,
    email: createdUser.email,
    contactNumber: createdUser.contact_number,
    isActive: createdUser.is_active,
    role: roleRecord.role_name,
  };
}

export { createUserService };
