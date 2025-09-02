const { default: slugify } = require('slugify');
const brandModel = require('../models/carBrand');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'storage/brands';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const { name } = req.body;
        cb(null, `${slugify(name)}.png`);
    }
});
const upload = multer({ storage });

const createBrand = async (req, res) => {
    try {
        const { name } = req.body;
        const brandPictures = req.file.path;

        if (!name) {
            return res.send({ message: 'Brand Name is Required' });
        }
        if (!brandPictures) {
            return res.send({ message: 'Brand Image is Required' });
        }

        const existCategory = await brandModel.findOne({ name });

        if (existCategory) {
            return res.status(200).send({
                success: true,
                message: 'Name is Already Exist',
            });
        }

        const brand = new brandModel({ name, brandPictures: "/"+brandPictures, slug: slugify(name) });        
        await brand.save();
        res.status(201).send({
            success: true,
            message: 'Brand Created Successfully',
            brand,
        });
    } catch (err) {
        res.status(500).send({
            success: false,
            message: 'Error in creating Brand',
            err,
        });
    }
};

const getDriveFileId = (url) => {
    const regex = /\/d\/([a-zA-Z0-9_-]+)\//;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const getBrand = async (req, res) => {
    try {
        const brands = await brandModel.find({}).populate('carInvoleInThisBrand');

        const updatedBrands = brands.map(brand => {
            const fileId = getDriveFileId(brand.brandPictures);
            if (fileId) {
                brand.brandPictures = `https://lh3.googleusercontent.com/d/${fileId}=w1000?authuser=0`;
            }
            return brand;
        });

        res.status(200).send({
            success: true,
            totalBrand: updatedBrands.length,
            message: "All Brands",
            brands: updatedBrands
        });
    } catch (err) {
        res.status(500).send({
            success: false,
            message: "Error in Getting Brand",
            err
        });
    }
};

const getBrandById = async (req, res) => {
    try {
        const brand = await brandModel.findOne({ slug: req.params.slug }).populate('carInvoleInThisBrand');

        if (!brand) {
            return res.status(404).send({
                success: false,
                message: "Brand not found"
            });
        }

        const convertDriveUrl = (url) => {
            const fileId = getDriveFileId(url);
            return fileId ? `https://lh3.googleusercontent.com/d/${fileId}=w1000?authuser=0` : url;
        };

        brand.brandPictures = convertDriveUrl(brand.brandPictures);

        brand.carInvoleInThisBrand.forEach(car => {
            car.productPictures = car.productPictures.map(picture => convertDriveUrl(picture));
        });

        res.status(200).send({
            success: true,
            message: "Brand By this Id",
            brand
        });
    } catch (err) {
        res.status(500).send({
            success: false,
            message: "Error in Finding Brand Id",
            err
        });
    }
};

const updateBrand = async (req, res) => {
    try {
        const { name } = req.body;
        const { id } = req.params;

        const brand = await brandModel.findByIdAndUpdate(id, { name, slug: slugify(name) }, { new: true });
        res.status(200).send({
            success: true,
            message: "Brand Updated Successfully",
            brand
        });
    } catch (err) {
        res.status(500).send({
            success: false,
            message: "Error in Updating Brand",
            err
        });
    }
};

const deleteBrand = async (req, res) => {
    try {
        const { id } = req.params;
        try {
            for (const x of carModel_.brandPictures) {
                fs.unlink(path.join(__dirname, '../uploads/', x), (err) => {
                    if (err) {
                        throw err;
                    }
                })
            }
        } catch (e) {
            console.log("Delete: " + e)
        }
        await brandModel.findByIdAndDelete(id)
        res.status(200).send({
            success: true,
            message: "Brand Deleted Successfully"
        })
    } catch (err) {
        res.status(500).send({
            success: false,
            message: "Error in Deleting Brand",
            err
        })
    }
}

module.exports = { getBrand, getBrandById, createBrand, upload, updateBrand, deleteBrand }