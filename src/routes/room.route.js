import express from "express";
import {
  createRoomImage,
  deleteRoom,
  deleteRoomImage,
  updateRoom,
  getRoom,
  replaceRoomImage,
} from "../controllers/room.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  uploadRoomImage,
  validateRoomImageType,
} from "../utils/uploadCloudRoom.js";

const roomRoute = express();

roomRoute.delete("/:roomId", authenticate, deleteRoom);
roomRoute.patch("/:roomId", authenticate, updateRoom);
roomRoute.get("/:roomId", authenticate, getRoom);

roomRoute.post(
  "/:roomId/images",
  authenticate,
  allowRoles("OWNER"),
  uploadRoomImage,
  validateRoomImageType,
  createRoomImage
);
roomRoute.put(
  "/:roomId/image",
  authenticate,
  allowRoles("OWNER"),
  uploadRoomImage,
  validateRoomImageType,
  replaceRoomImage
);
roomRoute.delete("/:roomId/images/:imageId", authenticate, allowRoles("OWNER"), deleteRoomImage);



export default roomRoute;
