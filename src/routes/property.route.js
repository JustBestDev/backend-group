import express from "express";
import {
  createPropertyAddress,
  createProperty,
  createRoomById,
  getPropertyById,
  updatePropertyAddress,
} from "../controllers/property.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
const propertyRoute = express();

propertyRoute.post("/", authenticate, allowRoles("OWNER"), createProperty);
propertyRoute.post("/:propertyId/address", authenticate, allowRoles("OWNER"), createPropertyAddress);
propertyRoute.patch(
  "/:propertyId/address",
  authenticate,
  allowRoles("OWNER"),
  updatePropertyAddress
);


propertyRoute.get("/:propertyId/rooms", getPropertyById);
propertyRoute.post("/:propertyId/rooms", authenticate, createRoomById);
export default propertyRoute;
