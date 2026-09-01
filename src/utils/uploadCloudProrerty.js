import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import createError from "http-errors";

export const MAX_PROPERTY_IMAGES = 5;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_PROPERTY_IMAGES,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      return callback(createError(400, "Only image files are allowed"));
    }
    callback(null, true);
  },
});

const uploadMany = upload.array("images", MAX_PROPERTY_IMAGES);

export function uploadPropertyImages(req, res, next) {
  uploadMany(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(createError(400, "Each image must not exceed 5 MB"));
      }
      if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
        return next(
          createError(
            400,
            `Upload no more than ${MAX_PROPERTY_IMAGES} images at a time`
          )
        );
      }
    }

    return next(error);
  });
}

function uploadImageBuffer(file, propertyId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `properties/${propertyId}`,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
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

export async function uploadImagesToCloudinary(files, propertyId) {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw createError(500, "Cloudinary environment variables are not configured");
  }

  const results = await Promise.allSettled(
    files.map((file) => uploadImageBuffer(file, propertyId))
  );
  const uploadedImages = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  const failedUpload = results.find((result) => result.status === "rejected");

  if (failedUpload) {
    await deleteCloudinaryImages(uploadedImages.map((image) => image.publicId));
    throw createError(502, `Cloudinary upload failed: ${failedUpload.reason.message}`);
  }
  return uploadedImages;
}

export async function deleteCloudinaryImages(publicIds) {
  const failedPublicIds = [];

  for (const publicId of publicIds) {
    let deleted = false;
    for (let attempt = 1; attempt <= 3 && !deleted; attempt += 1) {
      try {
        const result = await cloudinary.uploader.destroy(publicId, {
          resource_type: "image",
          invalidate: true,
        });
        deleted = ["ok", "not found"].includes(result.result);
      } catch (error) {
        if (attempt === 3) {
          console.error("Cloudinary cleanup failed", { publicId, error });
        }
      }
    }
    if (!deleted) failedPublicIds.push(publicId);
  }

  return failedPublicIds;
}

export function getPublicIdFromCloudinaryUrl(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const uploadMarker = "/image/upload/";
    const uploadIndex = url.pathname.indexOf(uploadMarker);

    if (uploadIndex === -1) {
      throw new Error("Invalid Cloudinary image URL");
    }

    const pathAfterUpload = url.pathname.slice(uploadIndex + uploadMarker.length);
    const pathParts = pathAfterUpload.split("/");

    if (/^v\d+$/.test(pathParts[0])) {
      pathParts.shift();
    }

    const publicIdWithExtension = decodeURIComponent(pathParts.join("/"));
    const lastDotIndex = publicIdWithExtension.lastIndexOf(".");

    return lastDotIndex > -1
      ? publicIdWithExtension.slice(0, lastDotIndex)
      : publicIdWithExtension;
  } catch (error) {
    throw createError(500, "Invalid Cloudinary URL stored in database");
  }
}

export async function deleteImageFromCloudinary(imageUrl, storedPublicId) {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw createError(500, "Cloudinary environment variables are not configured");
  }

  const publicId = storedPublicId || getPublicIdFromCloudinaryUrl(imageUrl);

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });

    if (!["ok", "not found"].includes(result.result)) {
      throw new Error(`Cloudinary delete returned: ${result.result}`);
    }

    return result;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(502, "Cloudinary delete failed");
  }
}
