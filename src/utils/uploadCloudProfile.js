import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import createError from "http-errors";
import { fileTypeFromBuffer } from "file-type";
import multer from "multer";

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: MAX_PROFILE_IMAGE_SIZE,
  },
}).single("profileImage");

const ensureCloudinaryConfig = () => {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw createError(500, "Cloudinary environment variables are not configured");
  }
};

export function uploadProfileImage(req, res, next) {
  uploadSingle(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(createError(400, "Profile image must not exceed 5 MB"));
      }

      if (
        error.code === "LIMIT_FILE_COUNT" ||
        error.code === "LIMIT_UNEXPECTED_FILE"
      ) {
        return next(createError(400, "Upload only one profile image"));
      }

      return next(createError(400, `Invalid profile image upload: ${error.message}`));
    }

    return next(createError(400, "Invalid multipart form data"));
  });
}

export async function validateProfileImageType(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return next();
    }

    const detectedType = await fileTypeFromBuffer(req.file.buffer);

    if (!detectedType || !ALLOWED_PROFILE_IMAGE_TYPES.includes(detectedType.mime)) {
      throw createError(400, "Profile image must be a JPEG, PNG, or WebP file");
    }

    req.file.detectedMimeType = detectedType.mime;
    req.file.detectedExtension = detectedType.ext;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function uploadProfileImageToCloudinary(file, userId) {
  ensureCloudinaryConfig();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `profiles/${userId}`,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(createError(502, "Cloudinary profile image upload failed"));
        }

        return resolve({
          imageUrl: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    stream.end(file.buffer);
  });
}

const getPublicIdFromCloudinaryUrl = (imageUrl) => {
  const url = new URL(imageUrl);
  const uploadMarker = "/image/upload/";
  const uploadIndex = url.pathname.indexOf(uploadMarker);

  if (uploadIndex === -1) {
    throw new Error("Invalid Cloudinary image URL");
  }

  const pathParts = url.pathname
    .slice(uploadIndex + uploadMarker.length)
    .split("/");

  if (/^v\d+$/.test(pathParts[0])) {
    pathParts.shift();
  }

  const publicIdWithExtension = decodeURIComponent(pathParts.join("/"));
  const extensionIndex = publicIdWithExtension.lastIndexOf(".");

  return extensionIndex > -1
    ? publicIdWithExtension.slice(0, extensionIndex)
    : publicIdWithExtension;
};

export async function deleteProfileImageFromCloudinary(imageUrl, publicId) {
  ensureCloudinaryConfig();
  const resolvedPublicId = publicId || getPublicIdFromCloudinaryUrl(imageUrl);

  const result = await cloudinary.uploader.destroy(resolvedPublicId, {
    resource_type: "image",
    invalidate: true,
  });

  if (!["ok", "not found"].includes(result.result)) {
    throw new Error(`Cloudinary delete returned: ${result.result}`);
  }

  return result;
}
