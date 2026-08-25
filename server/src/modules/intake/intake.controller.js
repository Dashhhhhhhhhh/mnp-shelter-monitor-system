import {
  createAnimalIntake,
  getAnimalIntakes,
  getIntakeById,
  updateIntake,
} from "./intake.service.js";

async function createAnimalIntakeController(req, res, next) {
  try {
    const idempotencyKey = req.get("Idempotency-Key");

    const { intake, isReplay } = await createAnimalIntake(
      req.params.animalId,
      req.body,
      req.user.userId,
      idempotencyKey,
    );

    return res.status(isReplay ? 200 : 201).json({
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
    const intake = await getIntakeById(
      req.params.animalId,
      req.params.intakeId,
    );

    return res.status(200).json({
      success: true,
      intake,
    });
  } catch (error) {
    next(error);
  }
}

async function updateIntakeController(req, res, next) {
  try {
    const intake = await updateIntake(
      req.params.animalId,
      req.params.intakeId,
      req.body,
      req.user.userId,
    );

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
  updateIntakeController,
};
