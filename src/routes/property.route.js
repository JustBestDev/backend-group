import express from "express";
import {
  checkPropertyImageCapacity,
  createPropertyAddress,
  createPropertyImages,
  createProperty,
  createRoomById,
  deletePropertyImage,
  deleteProperty,
  getMyProperties,
  getProperties,
  getPropertyById,
  getPropertyRooms,
  updateProperty,
  updatePropertyAddress,
  updatePropertyStatus,
} from "../controllers/property.controller.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  uploadPropertyImages,
  validatePropertyImageTypes,
} from "../utils/uploadCloudProperty.js";
const propertyRoute = express();

propertyRoute.get("/", getProperties);
propertyRoute.post("/", authenticate, allowRoles("OWNER"), createProperty);
propertyRoute.get("/me", authenticate, allowRoles("OWNER"), getMyProperties);
propertyRoute.get("/:propertyId", optionalAuthenticate, getPropertyById);
propertyRoute.patch("/:propertyId", authenticate, allowRoles("OWNER"), updateProperty);
propertyRoute.delete("/:propertyId", authenticate, allowRoles("OWNER"), deleteProperty);
propertyRoute.patch("/:propertyId/status", authenticate, allowRoles("OWNER"), updatePropertyStatus);

propertyRoute.post("/:propertyId/address", authenticate, allowRoles("OWNER"), createPropertyAddress);
propertyRoute.patch("/:propertyId/address", authenticate, allowRoles("OWNER"), updatePropertyAddress);

propertyRoute.post(
  "/:propertyId/images",
  authenticate,
  allowRoles("OWNER"),
  uploadPropertyImages,
  validatePropertyImageTypes,
  checkPropertyImageCapacity,
  createPropertyImages
);
propertyRoute.delete("/:propertyId/images/:imageId", authenticate, allowRoles("OWNER"), deletePropertyImage);


propertyRoute.get("/:propertyId/rooms", getPropertyRooms);
propertyRoute.post("/:propertyId/rooms", authenticate, allowRoles("OWNER"), createRoomById);


export default propertyRoute;
