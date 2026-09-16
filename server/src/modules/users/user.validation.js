function validateCreateUserInput(userData) {
  if (!userData || typeof userData !== "object" || Array.isArray(userData)) {
    const error = new Error("Invalid request body");
    error.statusCode = 400;
    throw error;
  }

  const password = userData.password;

  if (typeof password !== "string" || password.length < 10) {
    const error = new Error("Password must be at least 10 characters");
    error.statusCode = 400;
    throw error;
  }

  if (!/[A-Z]/.test(password)) {
    const error = new Error(
      "Password must contain at least one uppercase letter",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!/[0-9]/.test(password)) {
    const error = new Error("Password must contain at least one number");
    error.statusCode = 400;
    throw error;
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    const error = new Error("Password must contain at least one symbol");
    error.statusCode = 400;
    throw error;
  }

  const role =
    typeof userData.role === "string"
      ? userData.role.trim().toUpperCase()
      : null;

  if (!role) {
    const error = new Error("Role is required");
    error.statusCode = 400;
    throw error;
  }

  const allowedRoles = ["VOLUNTEER", "CARETAKER"];

  if (!allowedRoles.includes(role)) {
    const error = new Error("Role must be VOLUNTEER or CARETAKER");
    error.statusCode = 400;
    throw error;
  }

  const firstName =
    typeof userData.firstName === "string" ? userData.firstName.trim() : null;

  if (!firstName) {
    const error = new Error("First name is required");
    error.statusCode = 400;
    throw error;
  }
  const middleInitial =
    typeof userData.middleInitial === "string"
      ? userData.middleInitial.trim() || null
      : null;

  const lastName =
    typeof userData.lastName === "string" ? userData.lastName.trim() : null;

  if (!lastName) {
    const error = new Error("Last name is required");
    error.statusCode = 400;
    throw error;
  }

  const email =
    typeof userData.email === "string"
      ? userData.email.trim().toLowerCase()
      : null;

  if (!email) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  const contactNumber =
    typeof userData.contactNumber === "string"
      ? userData.contactNumber.trim() || null
      : null;

  return {
    role,
    firstName,
    middleInitial,
    lastName,
    email,
    password,
    contactNumber,
  };
}

export { validateCreateUserInput };
