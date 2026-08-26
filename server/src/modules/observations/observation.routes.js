import express from "express";

import { authenticate } from "../../middlewares/authenticate.js";

import { authorizeRoles } from "../../middlewares/authorizeRoles.js";

import {
  createObservationController,
  getObservationsController,
  getObservationByIdController,
  updateObservationController,
  claimObservationController,
  monitorObservationController,
  resolveObservationController,
  escalateObservationController,
  takeOverObservationController,
} from "./observation.controller.js";

const router = express.Router();

router.use(authenticate);

router.post(
  "/observations",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  createObservationController,
);

router.get(
  "/observations",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getObservationsController,
);

router.get(
  "/observations/:observationId",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getObservationByIdController,
);

router.patch(
  "/observations/:observationId",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  updateObservationController,
);

router.post(
  "/observations/:observationId/claim",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  claimObservationController,
);

router.post(
  "/observations/:observationId/monitor",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  monitorObservationController,
);

router.post(
  "/observations/:observationId/resolve",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  resolveObservationController,
);

router.post(
  "/observations/:observationId/escalate",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  escalateObservationController,
);

router.post(
  "/observations/:observationId/take-over",
  authorizeRoles("ADMIN"),
  takeOverObservationController,
);

export default router;
