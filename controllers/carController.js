const slugify = require("slugify");
const carModel = require("../models/carModel");
const orderModel = require("../models/orderModel");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { google } = require("googleapis");
const dotenv = require("dotenv");
const braintree = require("braintree");
const brandModel = require("../models/carBrand");

dotenv.config();

// ---------------- Braintree Setup ----------------
const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

// ---------------- Multer Setup ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "storage/cars");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ---------------- Google Drive Setup ----------------
const KEYFILEPATH = path.join(__dirname, "cred.json");
const SCOPES = ["https://www.googleapis.com/auth/drive"];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const drive = google.drive({ version: "v3", auth });
const FOLDER_ID = "1i-lD7Q_-R2Ry6jUfyUF7JLZ-iv0TA7H1";

// Upload file to Google Drive
const uploadFileToGoogleDrive = async (filePath, fileName) => {
  const fileMetadata = {
    name: fileName,
    parents: [FOLDER_ID],
  };
  const media = {
    mimeType: "image/jpeg",
    body: fs.createReadStream(filePath),
  };
  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id, webViewLink",
  });
  return response.data;
};

// Extract File ID from Google Drive URL
const getDriveFileId = (url) => {
  const regex = /\/d\/([a-zA-Z0-9_-]+)\//;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// ---------------- Controllers ----------------

// Create Car
const createCar = async (req, res) => {
  try {
    const {
      name,
      description,
      brand,
      price,
      fuelType,
      transmission,
      engineSize,
      mileage,
      safetyrating,
      warranty,
      seater,
      size,
      fuelTank,
    } = req.body;

    const requiredFields = [
      "name",
      "description",
      "brand",
      "price",
      "fuelType",
      "transmission",
      "engineSize",
      "mileage",
      "safetyrating",
      "warranty",
      "seater",
      "size",
      "fuelTank",
    ];
    for (let field of requiredFields) {
      if (!req.body[field]) {
        return res
          .status(400)
          .send({ success: false, message: `${field} is required` });
      }
    }

    // Upload images to Drive
    let uploadedFiles = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const driveFile = await uploadFileToGoogleDrive(
          file.path,
          file.filename
        );
        uploadedFiles.push(
          `https://drive.google.com/file/d/${driveFile.id}/view`
        );
        // remove local file
        fs.unlinkSync(file.path);
      }
    }

    const slug = slugify(name);

    const car = new carModel({
      name,
      slug,
      description,
      brand,
      productPictures: uploadedFiles,
      price,
      fuelType,
      transmission,
      engineSize,
      mileage,
      safetyrating,
      warranty,
      seater,
      size,
      fuelTank,
    });

    await car.save();

    // Push car into brand
    const category = await brandModel.findById(brand);
    if (category) {
      category.carInvoleInThisBrand.push(car._id);
      await category.save();
    }

    res.status(201).send({
      success: true,
      message: "Car created successfully",
      car,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      success: false,
      message: "Error in creating car",
      error: err.message,
    });
  }
};

// Get all cars
const getAllCar = async (req, res) => {
  try {
    const cars = await carModel.find({}).populate("brand");

    const updatedCars = cars.map((car) => {
      // Convert product pictures
      car.productPictures = car.productPictures.map((picture) => {
        const fileId = getDriveFileId(picture);
        return fileId
          ? `https://lh3.googleusercontent.com/d/${fileId}=w1000?authuser=0`
          : picture;
      });

      // Convert brand picture
      if (car.brand && car.brand.brandPictures) {
        const fileId = getDriveFileId(car.brand.brandPictures);
        car.brand.brandPictures = fileId
          ? `https://lh3.googleusercontent.com/d/${fileId}=w1000?authuser=0`
          : car.brand.brandPictures;
      }

      return car;
    });

    res.status(200).send({
      success: true,
      totalCar: updatedCars.length,
      message: "All cars",
      cars: updatedCars,
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: "Error in getting cars",
      error: err.message,
    });
  }
};

// Get single car by slug
const getCarById = async (req, res) => {
  try {
    const car = await carModel
      .findOne({ slug: req.params.slug })
      .populate("brand");

    if (!car) {
      return res.status(404).send({
        success: false,
        message: "Car not found",
      });
    }

    car.productPictures = car.productPictures.map((picture) => {
      const fileId = getDriveFileId(picture);
      return fileId
        ? `https://lh3.googleusercontent.com/d/${fileId}=w1000?authuser=0`
        : picture;
    });

    if (car.brand && car.brand.brandPictures) {
      const fileId = getDriveFileId(car.brand.brandPictures);
      car.brand.brandPictures = fileId
        ? `https://lh3.googleusercontent.com/d/${fileId}=w1000?authuser=0`
        : car.brand.brandPictures;
    }

    res.status(200).send({
      success: true,
      message: "Car by this slug",
      car,
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: "Error in getting car by slug",
      error: err.message,
    });
  }
};

// Delete car
const deleteCar = async (req, res) => {
  try {
    const car = await carModel.findById(req.params.pid);
    if (!car) {
      return res.status(404).send({
        success: false,
        message: "Car not found",
      });
    }

    await carModel.findByIdAndDelete(req.params.pid);

    res.status(200).send({
      success: true,
      message: "Car deleted successfully",
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: "Error in deleting car",
      error: err.message,
    });
  }
};

// Update car
const updateCar = async (req, res) => {
  try {
    const { name } = req.body;

    const car = await carModel.findByIdAndUpdate(
      req.params.pid,
      { ...req.body, slug: slugify(name) },
      { new: true }
    );

    if (!car) {
      return res.status(404).send({
        success: false,
        message: "Car not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Car updated successfully",
      car,
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: "Error in updating car",
      error: err.message,
    });
  }
};

// Related cars
const relatedCar = async (req, res) => {
  try {
    const { cid, bid } = req.params;
    const cars = await carModel
      .find({ brand: bid, _id: { $ne: cid } })
      .populate("brand");

    res.status(200).send({
      success: true,
      message: "Related cars for this brand",
      cars,
    });
  } catch (err) {
    res.status(400).send({
      success: false,
      message: "Error while fetching related cars",
      error: err.message,
    });
  }
};

// Braintree Controllers
const braintreeTokenController = async (req, res) => {
  try {
    gateway.clientToken.generate({}, (err, response) => {
      if (err) res.status(500).send(err);
      else res.send(response);
    });
  } catch (error) {
    console.log(error);
  }
};

const brainTreePaymentController = async (req, res) => {
  try {
    const { nonce, cart } = req.body;
    let total = 0;
    cart.forEach((i) => (total += i.price));

    gateway.transaction.sale(
      {
        amount: total,
        paymentMethodNonce: nonce,
        options: { submitForSettlement: true },
      },
      function (error, result) {
        if (result) {
          new orderModel({
            products: cart,
            payment: result,
            buyer: req.user._id,
          }).save();
          res.json({ ok: true });
        } else {
          res.status(500).send(error);
        }
      }
    );
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  upload,
  createCar,
  getAllCar,
  getCarById,
  deleteCar,
  updateCar,
  relatedCar,
  braintreeTokenController,
  brainTreePaymentController,
};
