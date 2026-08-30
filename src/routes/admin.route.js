import express from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";

import {
  getUsers,
  getAdminDashboard,
  getOwnerApplications,
  getOwnerApplicationById,
  reviewOwnerApplication,
  getAdminProperties,
  getAdminPropertyById,
  reviewProperty,
} from "../controllers/admin.controller.js";

const router = express.Router();

// ทุก Route ด้านล่างต้อง Login ก่อน
router.use(authenticate);

// และต้องมี role เป็น ADMIN
router.use(allowRoles("ADMIN"));

// ================================
// USER MANAGEMENT
// ================================

router.get(
  "/users",
  getUsers
);

// ================================
// ADMIN DASHBOARD
// ================================

router.get(
  "/dashboard",
  getAdminDashboard
);

// ================================
// OWNER APPLICATION
// ================================

// ดูคำขอสมัคร Owner ทั้งหมด
router.get(
  "/owner-applications",
  getOwnerApplications
);

// ดูคำขอสมัคร Owner รายการเดียว
router.get(
  "/owner-applications/:applicationId",
  getOwnerApplicationById
);

// อนุมัติหรือปฏิเสธคำขอ Owner
router.patch(
  "/owner-applications/:applicationId",
  reviewOwnerApplication
);

// ================================
// PROPERTY APPROVAL
// ================================

// ดูประกาศทั้งหมด
router.get(
  "/properties",
  getAdminProperties
);

// ดูรายละเอียดประกาศ
router.get(
  "/properties/:propertyId",
  getAdminPropertyById
);

// อนุมัติหรือปฏิเสธประกาศ
router.patch(
  "/properties/:propertyId/publish-status",
  reviewProperty
);

export default router;
