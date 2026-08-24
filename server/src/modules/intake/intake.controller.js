import {
  createAnimalIntake,
  getAnimalIntakes,
  getIntakeById,
} from "./intake.service.js";

async function createAnimalIntakeController(req, res, next) {
  try {
    const intake = await createAnimalIntake(
      req.params.animalId,
      req.body,
      req.user.userId,
    );

    return res.status(201).json({
      success: true,
      intake,
    });
  } catch (error) {
    next(error);
  }
}

async function getAnimalIntakesController(req, res, next) {
  try {
    const intakes = await getAnimalIntakes(req.params.animalId);

    return res.status(200).json({
      success: true,
      intakes,
    });
  } catch (error) {
    next(error);
  }
}

async function getIntakeByIdController(req, res, next) {
  try {
    const intake = await getIntakeById(req.params.intakeId);

    return res.status(200).json({
      success: true,
      intake,
    });
  } catch (error) {
    next(error);
  }
}
export {
  createAnimalIntakeController,
  getAnimalIntakesController,
  getIntakeByIdController,
};
