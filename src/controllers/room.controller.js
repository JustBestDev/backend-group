import {
  createRoomImageService,
  deleteRoomService,
  deleteRoomImageService,
  updateRoomService,
} from "../services/room.service.js";
import { registerRoomSchema } from "../validations/schema.js";

export const deleteRoomImage = async (req, res, next) => {
  try {
    const image = await deleteRoomImageService(
      req.params.roomId,
      req.params.imageId,
      req.user.id
    );

    return res.status(200).json({
      status: "success",
      message: "Room image deleted successfully",
      data: image,
    });
  } catch (error) {
    return next(error);
  }
};

export const createRoomImage = async (req, res, next) => {
  try {
    const image = await createRoomImageService(
      req.params.roomId,
      req.user.id,
      req.file
    );

    return res.status(201).json({
      status: "success",
      message: "Room image uploaded successfully",
      data: image,
    });
  } catch (error) {
    return next(error);
  }
};

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
