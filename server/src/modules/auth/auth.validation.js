const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLoginInput(userData) {
  const email = userData.email?.trim().toLowerCase();
  const password = userData.password;

  if (!userData.email || !userData.password) {
    const error = new Error("Please enter all required fields");
    error.statusCode = 400;
    throw error;
  }

  if (typeof email !== "string" || typeof password !== "string") {
    const error = new Error("Email and password must be strings");
    error.statusCode = 400;
    throw error;
  }

  if (!emailPattern.test(email)) {
    const error = new Error("Please enter a valid email address");
    error.statusCode = 400;
    throw error;
  }

  return { email, password };
}

export { validateLoginInput };
