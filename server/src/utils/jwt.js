import jwt from "jsonwebtoken";

function generateToken({ userId, role }) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
export { generateToken, verifyToken };
