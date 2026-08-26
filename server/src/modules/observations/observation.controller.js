import {
  createObservation,
  getObservationById,
  getObservations,
  updateObservation,
  claimObservationWorkflow,
  monitorObservation,
  resolveObservation,
  escalateObservation,
  takeOverObservationWorkflow,
} from "./observation.service.js";

async function createObservationController(req, res, next) {
  try {
    const observation = await createObservation(req.body, req.user.userId);

    res.status(201).json({
      success: true,
      observation,
    });
  } catch (error) {
    next(error);
  }
}

async function getObservationsController(req, res, next) {
  try {
    const observations = await getObservations();

    res.status(200).json({
      success: true,
      observations,
    });
  } catch (error) {
    next(error);
  }
}

async function getObservationByIdController(req, res, next) {
  try {
    const observation = await getObservationById(req.params.observationId);

    res.status(200).json({
      success: true,
      observation,
    });
  } catch (error) {
    next(error);
  }
}

async function updateObservationController(req, res, next) {
  try {
    const observation = await updateObservation(
      req.params.observationId,
      req.body,
      req.user.userId,
      req.user.role,
    );

    res.status(200).json({
      success: true,
      observation,
    });
  } catch (error) {
    next(error);
  }
}

async function claimObservationController(req, res, next) {
  try {
    const observation = await claimObservationWorkflow(
      req.params.observationId,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      observation,
    });
  } catch (error) {
    next(error);
  }
}

async function monitorObservationController(req, res, next) {
  try {
    const observation = await monitorObservation(
      req.params.observationId,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      observation,
    });
  } catch (error) {
    next(error);
  }
}

async function resolveObservationController(req, res, next) {
  try {
    const observation = await resolveObservation(
      req.params.observationId,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      observation,
    });
  } catch (error) {
    next(error);
  }
}

async function escalateObservationController(req, res, next) {
  try {
    const observation = await escalateObservation(
      req.params.observationId,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      observation,
    });
  } catch (error) {
    next(error);
  }
}

async function takeOverObservationController(req, res, next) {
  try {
    const observation = await takeOverObservationWorkflow(
      req.params.observationId,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      observation,
    });
  } catch (error) {
    next(error);
  }
}

export {
  createObservationController,
  getObservationsController,
  getObservationByIdController,
  updateObservationController,
  claimObservationController,
  monitorObservationController,
  resolveObservationController,
  escalateObservationController,
  takeOverObservationController,
};
