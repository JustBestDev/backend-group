import express from "express";
import {
    createRental,
    getRentalById,
    getMyRentals,
    updateRentalStatus,
} from "../controllers/rental.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";

const rentalRoute = express.Router();

rentalRoute.post("/", authenticate, allowRoles("OWNER"), createRental);
rentalRoute.get("/me", authenticate, allowRoles("USER", "OWNER", "ADMIN"), getMyRentals);
rentalRoute.get("/:rentalId", authenticate, allowRoles("USER", "OWNER", "ADMIN"), getRentalById);
rentalRoute.patch("/:rentalId/status", authenticate, allowRoles("OWNER", "ADMIN"), updateRentalStatus);

export default rentalRoute;
