import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import createError from "http-errors";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      return callback(createError(400, "Only image files are allowed"));
    }
    callback(null, true);
  },
});

const uploadSingleRoomImage = upload.single("image");

export function uploadRoomImage(req, res, next) {
  uploadSingleRoomImage(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(createError(400, "Room image must not exceed 5 MB"));
      }
      if (
        error.code === "LIMIT_FILE_COUNT" ||
        error.code === "LIMIT_UNEXPECTED_FILE"
      ) {
        return next(createError(400, "Upload only one room image"));
      }
    }

    return next(error);
  });
}

export function uploadRoomImageToCloudinary(file, roomId) {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw createError(500, "Cloudinary environment variables are not configured");
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `rooms/${roomId}`,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(createError(502, "Cloudinary upload failed"));
        }
        resolve({
          imageUrl: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    stream.end(file.buffer);
  });
}

export async function deleteUploadedRoomImage(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
  } catch (error) {
    console.error("Room image cleanup failed", { publicId, error });
  }
}

function getRoomImagePublicId(imageUrl) {
  try {
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
  } catch (error) {
    throw createError(500, "Invalid Room image URL stored in database");
  }
}

export async function deleteRoomImageFromCloudinary(
  imageUrl,
  storedPublicId
) {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw createError(500, "Cloudinary environment variables are not configured");
  }

  const publicId = storedPublicId || getRoomImagePublicId(imageUrl);

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });

    if (!["ok", "not found"].includes(result.result)) {
      throw new Error("Cloudinary could not delete the Room image");
    }

    return result;
  } catch (error) {
    if (error.status) throw error;
    throw createError(502, "Cloudinary delete failed");
  }
}
