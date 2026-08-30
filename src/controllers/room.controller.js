import {
  deleteRoomService,
  updateRoomService,
} from "../services/room.service.js";
import { registerRoomSchema } from "../validations/schema.js";

// Delete room
export const deleteRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { id } = req.user;
    const result = await deleteRoomService(roomId, id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

// Patch update room
export const updateRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { id } = req.user;
    const body = registerRoomSchema.parse(req.body);
    const result = await updateRoomService(roomId, body, id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};
