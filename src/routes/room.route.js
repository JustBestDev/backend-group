import express from "express";
import { deleteRoom, updateRoom } from "../controllers/room.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const roomRoute = express();

roomRoute.delete("/:roomId", authenticate, deleteRoom);
roomRoute.patch("/:roomId", authenticate, updateRoom);

export default roomRoute;
