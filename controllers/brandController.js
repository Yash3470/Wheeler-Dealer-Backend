const { default: slugify } = require("slugify");
const brandModel = require("../models/carBrand");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Storage for brand images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "storage/brands";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const { name } = req.body;
    cb(null, `${slugify(name)}.png`);
  },
});
const upload = multer({ storage });

// ✅ Create brand
const createBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const brandPictures = req.file?.path;

    if (!name) return res.status(400).send({ message: "Brand Name is Required" });
    if (!brandPictures) return res.status(400).send({ message: "Brand Image is Required" });

    const existCategory = await brandModel.findOne({ name });
    if (existCategory) {
      return res.status(200).send({
        success: false,
        message: "Brand already exists",
      });
    }

    const brand = new brandModel({
      name,
      brandPictures: "/" + brandPictures,
      slug: slugify(name),
    });

    await brand.save();
    res.status(201).send({
      success: true,
      message: "Brand Created Successfully",
      brand,
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: "Error in creating Brand",
      error: err.message,
    });
  }
};

// ✅ Get all brands
const getBrand = async (req, res) => {
  try {
    const brands = await brandModel.find({}).populate("carInvoleInThisBrand");

    res.status(200).send({
      success: true,
      totalBrand: brands.length,
      message: "All Brands",
      brands,
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: "Error in Getting Brands",
      error: err.message,
    });
  }
};

// ✅ Get brand by slug
const getBrandById = async (req, res) => {
  try {
    const brand = await brandModel
      .findOne({ slug: req.params.slug })
      .populate("carInvoleInThisBrand");

    if (!brand) {
      return res.status(404).send({
        success: false,
        message: "Brand not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Brand Found",
      brand,
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: "Error in Finding Brand by Slug",
      error: err.message,
    });
  }
};

// ✅ Update brand
const updateBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.params;

    const brand = await brandModel.findByIdAndUpdate(
      id,
      { name, slug: slugify(name) },
      { new: true }
    );

    res.status(200).send({
      success: true,
      message: "Brand Updated Successfully",
      brand,
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: "Error in Updating Brand",
      error: err.message,
    });
  }
};

// ✅ Delete brand
const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    await brandModel.findByIdAndDelete(id);

    res.status(200).send({
      success: true,
      message: "Brand Deleted Successfully",
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: "Error in Deleting Brand",
      error: err.message,
    });
  }
};

module.exports = { getBrand, getBrandById, createBrand, upload, updateBrand, deleteBrand };
