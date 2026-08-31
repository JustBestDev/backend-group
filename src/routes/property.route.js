import express from "express";
import {
  createPropertyAddress,
  createProperty,
  createRoomById,
  deleteProperty,
  getMyProperties,
  getPropertyById,
  getPropertyRooms,
  updateProperty,
  updatePropertyAddress,
  updatePropertyStatus,
} from "../controllers/property.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
const propertyRoute = express();

propertyRoute.post("/", authenticate, allowRoles("OWNER"), createProperty);
propertyRoute.get("/me", authenticate, allowRoles("OWNER"), getMyProperties);
propertyRoute.get("/:propertyId", getPropertyById);
propertyRoute.patch("/:propertyId", authenticate, allowRoles("OWNER"), updateProperty);
propertyRoute.delete("/:propertyId", authenticate, allowRoles("OWNER"), deleteProperty);
propertyRoute.patch("/:propertyId/status", authenticate, allowRoles("OWNER"), updatePropertyStatus);

propertyRoute.post("/:propertyId/address", authenticate, allowRoles("OWNER"), createPropertyAddress);
propertyRoute.patch("/:propertyId/address", authenticate, allowRoles("OWNER"), updatePropertyAddress);


propertyRoute.get("/:propertyId/rooms", getPropertyRooms);
propertyRoute.post("/:propertyId/rooms", authenticate, createRoomById);
export default propertyRoute;
