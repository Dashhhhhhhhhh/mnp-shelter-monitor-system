import { createAnimal, getAnimals } from "./animal.service.js";

async function createAnimalController(req, res, next) {
  try {
    const animal = await createAnimal(req.body, req.user.userId);

    return res.status(201).json({
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

export { createAnimalController, getAnimalsController };
