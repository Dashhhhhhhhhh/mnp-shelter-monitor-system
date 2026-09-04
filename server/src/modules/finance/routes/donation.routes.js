import express from "express";

import {
  createDonationController,
  getDonationsController,
  getDonationByIdController,
  voidDonationController,
  createRestrictionChangeController,
  getRestrictionChangesController,
} from "../controllers/donation.controller.js";

import { authenticate } from "../../../middlewares/authenticate.js";

import { authorizeRoles } from "../../../middlewares/authorizeRoles.js";

const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  createDonationController,
);

router.get("/", authorizeRoles("ADMIN", "VOLUNTEER"), getDonationsController);

router.get(
  "/:donationId",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  getDonationByIdController,
);

router.post(
  "/:donationId/void",
  authorizeRoles("ADMIN"),
  voidDonationController,
);

router.post(
  "/:donationId/restriction-changes",
  authorizeRoles("ADMIN"),
  createRestrictionChangeController,
);

router.get(
  "/:donationId/restriction-changes",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  getRestrictionChangesController,
);

export default router;
