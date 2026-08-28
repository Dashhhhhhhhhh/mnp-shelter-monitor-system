import {
  createPreventiveCareService,
  getPreventiveCareService,
  getPreventiveCareRecordsService,
  getAnimalPreventiveCareService,
  updatePreventiveCareService,
} from "./preventiveCare.service.js";

async function createPreventiveCare(req, res, next) {
  try {
    const preventiveCare = await createPreventiveCareService(
      req.body,
      req.user.userId,
    );

    res.status(201).json({
      success: true,
      preventiveCare,
    });
  } catch (error) {
    next(error);
  }
}

async function getPreventiveCare(req, res, next) {
  try {
    const preventiveCare = await getPreventiveCareService(
      req.params.preventiveCareId,
    );

    res.status(200).json({
      success: true,
      preventiveCare,
    });
  } catch (error) {
    next(error);
  }
}

async function getPreventiveCareRecords(req, res, next) {
  try {
    const preventiveCareRecords = await getPreventiveCareRecordsService();

    res.status(200).json({
      success: true,
      preventiveCareRecords,
    });
  } catch (error) {
    next(error);
  }
}

async function getAnimalPreventiveCare(req, res, next) {
  try {
    const preventiveCareRecords = await getAnimalPreventiveCareService(
      req.params.animalId,
    );

    res.status(200).json({
      success: true,
      preventiveCareRecords,
    });
  } catch (error) {
    next(error);
  }
}

async function updatePreventiveCare(req, res, next) {
  try {
    const preventiveCare = await updatePreventiveCareService(
      req.params.preventiveCareId,
      req.body,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      preventiveCare,
    });
  } catch (error) {
    next(error);
  }
}

export {
  createPreventiveCare,
  getPreventiveCare,
  getPreventiveCareRecords,
  getAnimalPreventiveCare,
  updatePreventiveCare,
};
