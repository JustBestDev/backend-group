import express from "express";
import { getAmenities, getHouseRules } from "../controllers/catalog.controller.js";

const catalogRoute = express();

catalogRoute.get("/amenities", getAmenities);
catalogRoute.get("/house-rules", getHouseRules);

export default catalogRoute;
