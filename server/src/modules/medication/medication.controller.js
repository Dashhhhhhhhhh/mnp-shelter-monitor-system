import {
  createMedicationService,
  getMedicationService,
  getMedicationsService,
  getAnimalMedicationsService,
  updateMedicationService,
  completeMedicationService,
  discontinueMedicationService,
} from "./medication.service.js";

async function createMedication(req, res, next) {
  try {
    const medication = await createMedicationService(req.body, req.user.userId);

    res.status(201).json({
      success: true,
      medication,
    });
  } catch (error) {
    next(error);
  }
}

async function getMedication(req, res, next) {
  try {
    const medication = await getMedicationService(req.params.medicationId);

    res.status(200).json({
      success: true,
      medication,
    });
  } catch (error) {
    next(error);
  }
}

async function getMedications(req, res, next) {
  try {
    const medications = await getMedicationsService();

    res.status(200).json({
      success: true,
      medications,
    });
  } catch (error) {
    next(error);
  }
}

async function getAnimalMedications(req, res, next) {
  try {
    const medications = await getAnimalMedicationsService(req.params.animalId);

    res.status(200).json({
      success: true,
      medications,
    });
  } catch (error) {
    next(error);
  }
}

async function updateMedication(req, res, next) {
  try {
    const medication = await updateMedicationService(
      req.params.medicationId,
      req.body,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      medication,
    });
  } catch (error) {
    next(error);
  }
}

async function completeMedication(req, res, next) {
  try {
    const medication = await completeMedicationService(
      req.params.medicationId,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      medication,
    });
  } catch (error) {
    next(error);
  }
}

async function discontinueMedication(req, res, next) {
  try {
    const medication = await discontinueMedicationService(
      req.params.medicationId,
      req.body,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      medication,
    });
  } catch (error) {
    next(error);
  }
}

export {
  createMedication,
  getMedication,
  getMedications,
  getAnimalMedications,
  updateMedication,
  completeMedication,
  discontinueMedication,
};
