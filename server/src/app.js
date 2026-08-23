import express from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import cookieParser from "cookie-parser";

import { errorHandler } from "./middlewares/errorHandler.js";
import userRoutes from "./modules/users/user.routes.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.json({ message: "M & P Shelter Monitoring API is running!" });
});

app.use(errorHandler);

export default app;
