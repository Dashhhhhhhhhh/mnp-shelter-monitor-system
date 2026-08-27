import {
  createMedicalRecord,
  getMedicalRecordById,
  getMedicalRecords,
  getAnimalMedicalRecords,
  updateMedicalRecordService,
} from "./medical.service.js";

async function createMedicalRecordController(req, res, next) {
  try {
    const medicalRecord = await createMedicalRecord(req.body, req.user.userId);

    res.status(201).json({
      success: true,
      medicalRecord,
    });
  } catch (error) {
    next(error);
  }
}

async function getMedicalRecordsController(req, res, next) {
  try {
    const medicalRecords = await getMedicalRecords();

    res.status(200).json({
      success: true,
      medicalRecords,
    });
  } catch (error) {
    next(error);
  }
}

async function getMedicalRecordByIdController(req, res, next) {
  try {
    const medicalRecord = await getMedicalRecordById(
      req.params.medicalRecordId,
    );

    res.status(200).json({
      success: true,
      medicalRecord,
    });
  } catch (error) {
    next(error);
  }
}

async function getAnimalMedicalRecordsController(req, res, next) {
  try {
    const medicalRecords = await getAnimalMedicalRecords(req.params.animalId);

    res.status(200).json({
      success: true,
      medicalRecords,
    });
  } catch (error) {
    next(error);
  }
}

async function updateMedicalRecordController(req, res, next) {
  try {
    const medicalRecord = await updateMedicalRecordService(
      req.params.medicalRecordId,
      req.body,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      medicalRecord,
    });
  } catch (error) {
    next(error);
  }
}

export {
  createMedicalRecordController,
  getMedicalRecordsController,
  getMedicalRecordByIdController,
  getAnimalMedicalRecordsController,
  updateMedicalRecordController,
};
