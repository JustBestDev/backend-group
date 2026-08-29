import express from "express";
import {
  createRoomById,
  getPropertyById,
} from "../controllers/property.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
const propertyRoute = express();

propertyRoute.get("/:propertyId/rooms", getPropertyById);
propertyRoute.post("/:propertyId/rooms", authenticate, createRoomById);
export default propertyRoute;
