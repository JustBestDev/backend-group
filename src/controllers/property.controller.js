import {
  createRoomPropertyById,
  getRoomPropertyById,
} from "../services/property.service.js";
import { registerRoomSchema } from "../validations/schema.js";

export async function getPropertyById(req, res, next) {
  try {
    const property = await getRoomPropertyById(req.params.propertyId);
    return res.status(200).json(property);
  } catch (error) {
    next(error);
  }
}

export async function createRoomById(req, res, next) {
  try {
    const body = registerRoomSchema.parse(req.body);
    const newRoom = await createRoomPropertyById(
      req.params.propertyId,
      req.user.id,
      body
    );
    return res.status(200).json(newRoom);
  } catch (error) {
    next(error);
  }
}
