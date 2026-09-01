import {
  createRentalService,
  getRentalByIdService,
  getMyRentalsService,
  updateRentalStatusService,
} from "../services/rental.service.js";
import {
  createRentalSchema,
  getMyRentalsQuerySchema,
  updateRentalStatusSchema,
} from "../validations/schema.js";

export async function getMyRentals(req, res, next) {
  try {
    const query = getMyRentalsQuerySchema.parse(req.query);
    const result = await getMyRentalsService(req.user.id, query);

    return res.status(200).json({
      status: "success",
      message: "Rentals retrieved successfully",
      data: result.rentals,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRentalStatus(req, res, next) {
  try {
    const body = updateRentalStatusSchema.parse(req.body);
    const rental = await updateRentalStatusService(
      req.params.rentalId,
      req.user.id,
      req.user.role,
      body.status
    );

    return res.status(200).json({
      status: "success",
      message: "Rental status updated successfully",
      data: rental,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRentalById(req, res, next) {
  try {
    const rental = await getRentalByIdService(
      req.params.rentalId,
      req.user.id,
      req.user.role
    );

    return res.status(200).json({
      status: "success",
      message: "Rental retrieved successfully",
      data: rental,
    });
  } catch (error) {
    next(error);
  }
}

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
