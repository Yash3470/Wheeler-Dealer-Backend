const express = require("express");
const connection = require("./database/database");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const brandRoutes = require("./routes/brandRoutes");
const carRoutes = require("./routes/carRoutes");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

dotenv.config(); // Load env variables at the very top

const app = express();
const PORT = process.env.PORT || 5000

// CORS setup
app.use(cors({
    origin: [
        "http://localhost:3000",
        "https://wheeler-dealer-frontend.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));


// Body parser
app.use(express.json());

// Connect to DB
connection();

// Ensure required directories exist
const ensureDirectoryExistence = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

ensureDirectoryExistence(path.join(__dirname, "uploads"));
ensureDirectoryExistence(path.join(__dirname, "storage/brands"));
ensureDirectoryExistence(path.join(__dirname, "storage/cars"));

// Serve static files
app.use(express.static(path.join(__dirname, "uploads")));
app.use("/storage/brands", express.static(path.join(__dirname, "storage/brands")));
app.use("/storage/cars", express.static(path.join(__dirname, "storage/cars")));

// Routes
app.use("/api/user", userRoutes);
app.use("/api/brand", brandRoutes);
app.use("/api/car", carRoutes);

// Health check route (important for Render)
app.get("/", (req, res) => {
    res.send("🚀 Backend is running successfully!");
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
