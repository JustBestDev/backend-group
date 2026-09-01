import { createRentalService } from "../services/rental.service.js";
import { createRentalSchema } from "../validations/schema.js";

export async function createRental(req, res, next) {
  try {
    const body = createRentalSchema.parse(req.body);
    const rental = await createRentalService(req.user.id, body);

    return res.status(201).json({
      status: "success",
      message: "Rental created successfully",
      data: rental,
    });
  } catch (error) {
    next(error);
  }
}
