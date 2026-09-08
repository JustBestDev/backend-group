import {
  createRentalRequestService,
  getMyRentalRequestsService,
  getOwnerRentalRequestsService,
  getOwnerUnreadRentalRequestCountService,
  markOwnerRentalRequestsViewedService,
  reviewRentalRequestService,
} from "../services/rentalRequest.service.js";
import {
  createRentalRequestSchema,
  reviewRentalRequestSchema,
} from "../validations/schema.js";

export async function createRentalRequest(req, res, next) {
  try {
    const body = createRentalRequestSchema.parse(req.body);
    const rentalRequest = await createRentalRequestService(req.user.id, body);

    return res.status(201).json({
      status: "success",
      message: "Rental request created successfully",
      data: rentalRequest,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyRentalRequests(req, res, next) {
  try {
    const rentalRequests = await getMyRentalRequestsService(req.user.id);

    return res.status(200).json({
      status: "success",
      message: "Rental requests retrieved successfully",
      data: rentalRequests,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOwnerRentalRequests(req, res, next) {
  try {
    const rentalRequests = await getOwnerRentalRequestsService(req.user.id);

    return res.status(200).json({
      status: "success",
      message: "Rental requests retrieved successfully",
      data: rentalRequests,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOwnerUnreadRentalRequestCount(req, res, next) {
  try {
    const count = await getOwnerUnreadRentalRequestCountService(req.user.id);
    return res.status(200).json({ status: "success", data: { count } });
  } catch (error) {
    next(error);
  }
}

export async function markOwnerRentalRequestsViewed(req, res, next) {
  try {
    const result = await markOwnerRentalRequestsViewedService(req.user.id);
    return res.status(200).json({ status: "success", data: { count: result.count } });
  } catch (error) {
    next(error);
  }
}

export async function reviewRentalRequest(req, res, next) {
  try {
    const { action } = reviewRentalRequestSchema.parse(req.body);
    const rentalRequest = await reviewRentalRequestService(
      req.params.requestId,
      req.user.id,
      action,
    );

    return res.status(200).json({
      status: "success",
      message: `Rental request ${action.toLowerCase()}ed successfully`,
      data: rentalRequest,
    });
  } catch (error) {
    next(error);
  }
}
