function validateCreateUserInput(userData) {
  if (!userData || typeof userData !== "object" || Array.isArray(userData)) {
    const error = new Error("Invalid request body");
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

  const firstName =
    typeof userData.firstName === "string" ? userData.firstName.trim() : null;

  if (!firstName) {
    const error = new Error("First name is required");
    error.statusCode = 400;
    throw error;
  }

  const middleInitial =
    typeof userData.middleInitial === "string"
      ? userData.middleInitial.trim()
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

  const password = userData.password;

  const contactNumber = userData.contactNumber
    ? userData.contactNumber.trim()
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
