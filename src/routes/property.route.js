import express from "express";
import {
  createProperty,
  createRoomById,
  getPropertyById,
} from "../controllers/property.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
const propertyRoute = express();

propertyRoute.post("/", authenticate, allowRoles("OWNER"), createProperty);
propertyRoute.get("/:propertyId/rooms", getPropertyById);
propertyRoute.post("/:propertyId/rooms", authenticate, createRoomById);
export default propertyRoute;
