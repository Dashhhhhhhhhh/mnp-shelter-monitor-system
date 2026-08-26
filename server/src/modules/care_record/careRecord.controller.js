import {
  createCareRecord,
  completeCare,
  getCareRecordsByDate,
  getCareRecordsForCage,
} from "./careRecord.service.js";

async function createCareRecordController(req, res, next) {
  try {
    const careRecord = await createCareRecord(req.body, req.user.userId);

    res.status(201).json({
      success: true,
      careRecord,
    });
  } catch (error) {
    next(error);
  }
}

async function completeCareController(req, res, next) {
  try {
    const result = await completeCare(
      req.params.careRecordId,
      req.body,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

async function getCareRecordsByDateController(req, res, next) {
  try {
    const careRecords = await getCareRecordsByDate(req.query.date);

    res.status(200).json({
      success: true,
      careRecords,
    });
  } catch (error) {
    next(error);
  }
}

async function getCareRecordsForCageController(req, res, next) {
  try {
    const careRecords = await getCareRecordsForCage(req.params.cageId);

    res.status(200).json({
      success: true,
      careRecords,
    });
  } catch (error) {
    next(error);
  }
}

export {
  createCareRecordController,
  completeCareController,
  getCareRecordsByDateController,
  getCareRecordsForCageController,
};
