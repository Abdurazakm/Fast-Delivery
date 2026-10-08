const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log("☁️  Cloudinary configured successfully for receipt storage.");
} else {
  console.log("📁 Cloudinary credentials not detected; using local disk storage under uploads/receipts/.");
}

// 1. Cloudinary Storage Engine
let storage;
if (isCloudinaryConfigured) {
  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "ertib-delivery/receipts",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [
        { width: 1400, crop: "limit", quality: "auto", fetch_format: "auto" },
      ],
      public_id: (req, file) => {
        const baseName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
        return `receipt-${Date.now()}-${baseName}`;
      },
    },
  });
} else {
  // 2. Fallback Local Disk Storage Engine
  const localDir = path.join(__dirname, "../../uploads/receipts");
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, localDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `receipt-${uniqueSuffix}${ext}`);
    },
  });
}

const uploadReceipt = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for payment proof"), false);
    }
  },
});

/**
 * Returns permanent URL for the uploaded file:
 * - If Cloudinary: returns secure HTTPS URL
 * - If Local: returns /uploads/receipts/{filename}
 */
function getUploadedFileUrl(file) {
  if (!file) return null;
  if (file.path && (file.path.startsWith("http://") || file.path.startsWith("https://"))) {
    return file.path;
  }
  return `/uploads/receipts/${file.filename}`;
}

/**
 * Safely removes a temporary file from disk or Cloudinary
 */
async function deleteUploadedFile(file) {
  if (!file) return;
  try {
    if (isCloudinaryConfigured && file.filename) {
      // CloudinaryStorage sets file.filename to the public_id
      await cloudinary.uploader.destroy(file.filename);
    } else if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  } catch (err) {
    console.warn("Could not delete temporary uploaded file:", err.message);
  }
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadReceipt,
  getUploadedFileUrl,
  deleteUploadedFile,
};
