import express from "express";
import {
  createRoomImage,
  deleteRoom,
  deleteRoomImage,
  updateRoom,
} from "../controllers/room.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { uploadRoomImage } from "../utils/uploadCloudRoom.js";

const roomRoute = express();

roomRoute.delete("/:roomId", authenticate, deleteRoom);
roomRoute.patch("/:roomId", authenticate, updateRoom);

roomRoute.post("/:roomId/images", authenticate, allowRoles("OWNER"), uploadRoomImage, createRoomImage);
roomRoute.delete("/:roomId/images/:imageId", authenticate, allowRoles("OWNER"), deleteRoomImage);



export default roomRoute;
