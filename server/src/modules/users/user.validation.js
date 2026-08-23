function validateCreateUserInput(userData) {
  const role = userData.role.trim().toUpperCase();
  const firstName = userData.firstName.trim();
  const middleInitial = userData.middleInitial
    ? userData.middleInitial.trim()
    : null;
  const lastName = userData.lastName.trim();
  const email = userData.email.trim().toLowerCase();

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
