const express = require("express");
const { requireLogin, isAdmin } = require("../middleware/authMiddleware");
const {
  createBrand,
  updateBrand,
  deleteBrand,
  getBrand,
  getBrandById,
  upload,
} = require("../controllers/brandController");

const router = express.Router();

// ✅ Get all brands
router.get("/", getBrand);

// ✅ Get brand by slug
router.get("/:slug", getBrandById);

// ✅ Create brand (Admin only)
router.post("/", upload.single("brandPictures"), requireLogin, isAdmin, createBrand);

// ✅ Update brand (Admin only)
router.put("/:id", requireLogin, isAdmin, updateBrand);

// ✅ Delete brand (Admin only)
router.delete("/:id", requireLogin, isAdmin, deleteBrand);

module.exports = router;
