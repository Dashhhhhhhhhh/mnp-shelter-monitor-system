import express from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import cookieParser from "cookie-parser";

import { errorHandler } from "./middlewares/errorHandler.js";

import userRoutes from "./modules/users/user.routes.js";

import animalRoutes from "./modules/animals/animal.routes.js";

import { animalIntakeRouter } from "./modules/intake/intake.routes.js";

import cageRouter from "./modules/cages/cage.routes.js";

import cageAssignmentRouter from "./modules/cage_assignments/cageAssignment.routes.js";

import careRecordRouter from "./modules/care_record/careRecord.routes.js";

import observationRouter from "./modules/observations/observation.routes.js";

import medicalRouter from "./modules/medical/medical.routes.js";

import medicationRouter from "./modules/medication/medication.routes.js";

import preventiveCareRouter from "./modules/preventive_care/preventiveCare.routes.js";

import inventoryRouter from "./modules/inventory/inventory.routes.js";

import donationRouter from "./modules/finance/routes/donation.routes.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/animals", animalRoutes);

app.use("/api/animals/:animalId/intakes", animalIntakeRouter);

app.use("/api/cages", cageRouter);

app.use("/api", cageAssignmentRouter);

app.use("/api", careRecordRouter);

app.use("/api", observationRouter);

app.use("/api", medicalRouter);

app.use("/api", medicationRouter);

app.use("/api", preventiveCareRouter);

app.use("/api", inventoryRouter);

app.use("/api/donations", donationRouter);

app.get("/", (req, res) => {
  res.json({ message: "M & P Shelter Monitoring API is running!" });
});

app.use(errorHandler);

export default app;
