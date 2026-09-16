import { loginUser } from "./auth.service.js";

async function login(req, res, next) {
  try {
    const result = await loginUser(req.body);

    const isProduction =
      process.env.NODE_ENV?.trim().toLowerCase() === "production";

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
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
