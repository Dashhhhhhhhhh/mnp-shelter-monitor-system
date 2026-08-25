import {
  createCageAssignment,
  getCurrentAssignments,
  getCageAssignmentHistory,
  getAnimalCageHistory,
  removeCageAssignment,
  moveAnimal,
} from "./cageAssignment.service.js";

async function createCageAssignmentController(req, res, next) {
  try {
    const result = await createCageAssignment(req.body, req.user.userId);

    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

async function getCurrentAssignmentsController(req, res, next) {
  try {
    const assignments = await getCurrentAssignments();

    res.status(200).json({
      success: true,
      assignments,
    });
  } catch (error) {
    next(error);
  }
}

async function getCageAssignmentHistoryController(req, res, next) {
  try {
    const assignments = await getCageAssignmentHistory(req.params.cageId);

    res.status(200).json({
      success: true,
      assignments,
    });
  } catch (error) {
    next(error);
  }
}

async function getAnimalCageHistoryController(req, res, next) {
  try {
    const assignments = await getAnimalCageHistory(req.params.animalId);

    res.status(200).json({
      success: true,
      assignments,
    });
  } catch (error) {
    next(error);
  }
}

async function removeCageAssignmentController(req, res, next) {
  try {
    const assignment = await removeCageAssignment(
      req.params.assignmentId,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      assignment,
    });
  } catch (error) {
    next(error);
  }
}

async function moveAnimalController(req, res, next) {
  try {
    const result = await moveAnimal(
      req.params.animalId,
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

export {
  createCageAssignmentController,
  getCurrentAssignmentsController,
  getCageAssignmentHistoryController,
  getAnimalCageHistoryController,
  removeCageAssignmentController,
  moveAnimalController,
};
