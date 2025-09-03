const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const requireLogin = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    const decode = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decode; // should contain { _id, role } if you signed it correctly
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user._id);
    if (!user || user.role !== 1) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access, only admin can access"
      });
    }
    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error in Admin Middleware"
    });
  }
};

module.exports = { requireLogin, isAdmin };
