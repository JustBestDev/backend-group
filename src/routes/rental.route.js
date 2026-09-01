import express from "express";
import { createRental } from "../controllers/rental.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";

const rentalRoute = express.Router();

rentalRoute.post("/", authenticate, allowRoles("OWNER"), createRental);

export default rentalRoute;
