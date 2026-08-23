import { loginUser } from "./auth.service.js";

async function login(req, res, next) {
  try {
    const result = await loginUser(req.body);

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}

function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
}

function logout(req, res) {
  res.clearCookie("token");

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}

export { login, getMe, logout };
