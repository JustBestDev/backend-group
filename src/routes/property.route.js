import express from "express";
import { getPropertyById } from "../controllers/property.controller.js";
const propertyRoute = express();

propertyRoute.get("/:propertyId/rooms", getPropertyById);
export default propertyRoute;
