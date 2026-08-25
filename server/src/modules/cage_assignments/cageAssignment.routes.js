import express from "express";

import {
  createCageAssignmentController,
  getCurrentAssignmentsController,
  getCageAssignmentHistoryController,
  getAnimalCageHistoryController,
  removeCageAssignmentController,
  moveAnimalController,
} from "./cageAssignment.controller.js";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.js";

const router = express.Router();

router.use(authenticate);

// Assign an animal that currently has no cage
router.post(
  "/cage-assignments",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  createCageAssignmentController,
);

// View all current animal → cage placements
router.get(
  "/cage-assignments/current",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getCurrentAssignmentsController,
);

// Remove an animal from its current cage without moving it
router.post(
  "/cage-assignments/:assignmentId/remove",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  removeCageAssignmentController,
);

// View the placement history of one cage
router.get(
  "/cages/:cageId/assignments",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getCageAssignmentHistoryController,
);

// View the cage history of one animal
router.get(
  "/animals/:animalId/cage-history",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getAnimalCageHistoryController,
);

// Move an animal from its current cage to another cage
router.post(
  "/animals/:animalId/move",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  moveAnimalController,
);

export default router;
