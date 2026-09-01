// Get accept the request

import { updateJoinRequestService } from "../services/joinRequest.service.js";
import { updateJoinRequestSchema } from "../validations/schema.js";

export const updateJoinRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { action } = updateJoinRequestSchema.parse(req.body);
    const { id } = req.user;
    const result = await updateJoinRequestService(requestId, action, id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};
