import {
  createPropertyAddressService,
  createPropertyService,
  createRoomPropertyById,
  getMyPropertiesService,
  getPropertyByIdService,
  getRoomPropertyById,
  updatePropertyService,
  updatePropertyAddressService,
  updatePropertyStatusService,
} from "../services/property.service.js";
import {
  createPropertyAddressSchema,
  createPropertySchema,
  registerRoomSchema,
  updatePropertySchema,
  updatePropertyAddressSchema,
  updatePropertyStatusSchema,
} from "../validations/schema.js";

export async function getMyProperties(req, res, next) {
  try {
    const properties = await getMyPropertiesService(req.user.id);

    return res.status(200).json({
      status: "success",
      message: "Owner properties retrieved successfully",
      data: properties,
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePropertyStatus(req, res, next) {
  try {
    const body = updatePropertyStatusSchema.parse(req.body);
    const property = await updatePropertyStatusService(
      req.params.propertyId,
      req.user.id,
      body.propertyStatus
    );

    return res.status(200).json({
      status: "success",
      message: "Property status updated successfully",
      data: property,
    });
  } catch (error) {
    next(error);
  }
}


export async function createPropertyAddress(req, res, next) {
  try {
    const body = createPropertyAddressSchema.parse(req.body);
    const address = await createPropertyAddressService(
      req.params.propertyId,
      req.user.id,
      body
    );

    return res.status(201).json({
      status: "success",
      message: "Property address created successfully",
      data: address,
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePropertyAddress(req, res, next) {

  try {
    const body = updatePropertyAddressSchema.parse(req.body);
    const address = await updatePropertyAddressService(
      req.params.propertyId,
      req.user.id,
      body
    );

    return res.status(200).json({
      status: "success",
      message: "Property address updated successfully",
      data: address,
    });
  } catch (error) {
    next(error);
  }
}

export async function createProperty(req, res, next) {
  // console.log('req', req.body)
  try {
    const body = createPropertySchema.parse(req.body);
    const property = await createPropertyService(req.user.id, body);

    return res.status(201).json({
      status: "success",
      message: "Property created successfully",
      data: property,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProperty(req, res, next) {
  try {
    const body = updatePropertySchema.parse(req.body);
    const property = await updatePropertyService(
      req.params.propertyId,
      req.user.id,
      body
    );

    return res.status(200).json({
      status: "success",
      message: "Property updated successfully",
      data: property,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPropertyById(req, res, next) {
  try {
    const property = await getPropertyByIdService(req.params.propertyId);

    return res.status(200).json({
      status: "success",
      message: "Property retrieved successfully",
      data: property,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPropertyRooms(req, res, next) {
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
