const express = require('express');
const connection = require('./database/database');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const brandRoutes = require('./routes/brandRoutes');
const carRoutes = require('./routes/carRoutes');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

app.use(express.json());
dotenv.config();

connection();

// Ensure the directories exist
const ensureDirectoryExistence = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

ensureDirectoryExistence(path.join(__dirname, 'uploads'));
ensureDirectoryExistence(path.join(__dirname, 'storage/brands'));
ensureDirectoryExistence(path.join(__dirname, 'storage/cars'));

// Serve static files from the 'uploads' and 'storage/brands' directories
app.use(express.static(path.join(__dirname, 'uploads')));
app.use('/storage/brands', express.static(path.join(__dirname, 'storage/brands')));
app.use('/storage/cars', express.static(path.join(__dirname, 'storage/cars')));

app.use('/api/user', userRoutes);
app.use('/api/brand', brandRoutes);
app.use('/api/car', carRoutes);

app.listen(PORT, () => {
    console.log(`Car Running on port ${PORT}`);
});
