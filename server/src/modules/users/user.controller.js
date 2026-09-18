import { createUserService, getActiveStaffService } from "./user.service.js";

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

async function getActiveStaffController(req, res, next) {
  try {
    const staff = await getActiveStaffService();

    return res.status(200).json({
      success: true,
      staff,
    });
  } catch (error) {
    next(error);
  }
}

export { createUserController, getActiveStaffController };
