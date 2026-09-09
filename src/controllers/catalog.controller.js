import {
  getAmenitiesService,
  getHouseRulesService,
} from "../services/catalog.service.js";

export async function getAmenities(req, res, next) {
  try {
    res.status(200).json({ status: "success", data: await getAmenitiesService() });
  } catch (error) {
    next(error);
  }
}

export async function getHouseRules(req, res, next) {
  try {
    res.status(200).json({ status: "success", data: await getHouseRulesService() });
  } catch (error) {
    next(error);
  }
}
