import { getRoomPropertyById } from "../services/property.service.js";

export async function getPropertyById(req, res, next) {
  try {
    const property = await getRoomPropertyById(req.params.propertyId);
    return res.status(200).json(property);
  } catch (error) {
    return res.status(500).json({
      status: false,
      errorMessage: error,
      data: null,
    });
  }
}
