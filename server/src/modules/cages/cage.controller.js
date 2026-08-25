import {
  createCage,
  getCages,
  getCageById,
  updateCage,
} from "./cage.service.js";

async function createCageController(req, res, next) {
  try {
    const idempotencyKey = req.get("Idempotency-Key");

    const { cage, isReplay } = await createCage(
      req.body,
      req.user.userId,
      idempotencyKey,
    );

    res.status(isReplay ? 200 : 201).json({
      success: true,
      cage,
    });
  } catch (error) {
    next(error);
  }
}

async function getCagesController(req, res, next) {
  try {
    const cages = await getCages();

    res.status(200).json({
      success: true,
      cages,
    });
  } catch (error) {
    next(error);
  }
}

async function getCageByIdController(req, res, next) {
  try {
    const cage = await getCageById(req.params.cageId);

    res.status(200).json({
      success: true,
      cage,
    });
  } catch (error) {
    next(error);
  }
}

async function updateCageController(req, res, next) {
  try {
    const cage = await updateCage(req.params.cageId, req.body, req.user.userId);

    res.status(200).json({
      success: true,
      cage,
    });
  } catch (error) {
    next(error);
  }
}

export {
  createCageController,
  getCagesController,
  getCageByIdController,
  updateCageController,
};
