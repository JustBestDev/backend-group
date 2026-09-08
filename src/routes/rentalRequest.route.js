import express from "express";
import {
  createRentalRequest,
  getMyRentalRequests,
  getOwnerRentalRequests,
  getOwnerUnreadRentalRequestCount,
  markOwnerRentalRequestsViewed,
  reviewRentalRequest,
} from "../controllers/rentalRequest.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";

const rentalRequestRoute = express.Router();

rentalRequestRoute.post("/", authenticate, allowRoles("USER"), createRentalRequest);
rentalRequestRoute.get("/me", authenticate, allowRoles("USER"), getMyRentalRequests);
rentalRequestRoute.get("/owner", authenticate, allowRoles("OWNER"), getOwnerRentalRequests);
rentalRequestRoute.get("/owner/unread-count", authenticate, allowRoles("OWNER"), getOwnerUnreadRentalRequestCount);
rentalRequestRoute.patch("/owner/viewed", authenticate, allowRoles("OWNER"), markOwnerRentalRequestsViewed);
rentalRequestRoute.patch("/:requestId", authenticate, allowRoles("OWNER"), reviewRentalRequest);

export default rentalRequestRoute;
