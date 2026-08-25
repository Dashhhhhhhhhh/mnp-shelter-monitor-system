import {
  createAnimal,
  getAnimals,
  getAnimalById,
  updateAnimal,
  archiveAnimal,
} from "./animal.service.js";

async function createAnimalController(req, res, next) {
  try {
    const idempotencyKey = req.get("Idempotency-Key");

    const { animal, isReplay } = await createAnimal(
      req.body,
      req.user.userId,
      idempotencyKey,
    );

    return res.status(isReplay ? 200 : 201).json({
      success: true,
      animal,
    });
  } catch (error) {
    next(error);
  }
}

async function getAnimalsController(req, res, next) {
  try {
    const result = await getAnimals(req.query);

    return res.status(200).json({
      success: true,
      animals: result.animals,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

async function getAnimalByIdController(req, res, next) {
  try {
    const animal = await getAnimalById(req.params.animalId);

    return res.status(200).json({
      success: true,
      animal,
    });
  } catch (error) {
    next(error);
  }
}

async function updateAnimalController(req, res, next) {
  try {
    const animal = await updateAnimal(
      req.params.animalId,
      req.body,
      req.user.userId,
    );

    return res.status(200).json({
      success: true,
      animal,
    });
  } catch (error) {
    next(error);
  }
}

async function archiveAnimalController(req, res, next) {
  try {
    const animal = await archiveAnimal(req.params.animalId, req.user.userId);

    return res.status(200).json({
      success: true,
      animal,
    });
  } catch (error) {
    next(error);
  }
}

export {
  createAnimalController,
  getAnimalsController,
  getAnimalByIdController,
  updateAnimalController,
  archiveAnimalController,
};
