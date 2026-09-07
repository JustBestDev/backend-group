import express from "express";
import {
  createRentalRequest,
  getMyRentalRequests,
  getOwnerRentalRequests,
  reviewRentalRequest,
} from "../controllers/rentalRequest.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";

const rentalRequestRoute = express.Router();

rentalRequestRoute.post("/", authenticate, allowRoles("USER"), createRentalRequest);
rentalRequestRoute.get("/me", authenticate, allowRoles("USER"), getMyRentalRequests);
rentalRequestRoute.get("/owner", authenticate, allowRoles("OWNER"), getOwnerRentalRequests);
rentalRequestRoute.patch("/:requestId", authenticate, allowRoles("OWNER"), reviewRentalRequest);

export default rentalRequestRoute;
