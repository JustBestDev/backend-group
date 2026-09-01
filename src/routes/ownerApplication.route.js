import express from "express";

import {
  getMyOwnerApplication,
  submitOwnerApplication,
} from "../controllers/ownerApplication.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  uploadOwnerApplicationDocuments,
  validateOwnerApplicationDocuments,
} from "../utils/uploadCloudOwnerApplication.js";

const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  uploadOwnerApplicationDocuments,
  validateOwnerApplicationDocuments,
  submitOwnerApplication
);
router.get("/me", getMyOwnerApplication);

export default router;
