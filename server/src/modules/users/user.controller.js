import { createUserService } from "./user.service.js";

async function createUserController(req, res, next) {
  try {
    const user = await createUserService(req.body);
    return res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

export { createUserController };
