import "dotenv/config";
import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import createError from "http-errors";
import { fileTypeFromBuffer } from "file-type";

export const MAX_OWNER_DOCUMENTS = 5;
export const MAX_OWNER_DOCUMENT_SIZE = 5 * 1024 * 1024;
export const OWNER_DOCUMENT_URL_TTL_SECONDS = 10 * 60;

export function assertOwnerApplicationDocumentLimit(existingCount, newCount) {
  if (existingCount + newCount > MAX_OWNER_DOCUMENTS) {
    throw createError(400, `An owner application can have no more than ${MAX_OWNER_DOCUMENTS} documents`);
  }
}

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_OWNER_DOCUMENTS, fileSize: MAX_OWNER_DOCUMENT_SIZE },
});
const uploadMany = upload.array("documents", MAX_OWNER_DOCUMENTS);

export function uploadOwnerApplicationDocuments(req, res, next) {
  uploadMany(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(createError(400, "Each document must not exceed 5 MB"));
      }
      if (["LIMIT_FILE_COUNT", "LIMIT_UNEXPECTED_FILE"].includes(error.code)) {
        return next(createError(400, `Upload no more than ${MAX_OWNER_DOCUMENTS} documents`));
      }
    }
    return next(error);
  });
}

export async function validateOwnerApplicationDocuments(req, res, next) {
  try {
    if (!req.files?.length) throw createError(400, "At least one document is required");
    for (const file of req.files) {
      const detected = await fileTypeFromBuffer(file.buffer);
      if (!detected || !allowedMimeTypes.has(detected.mime)) {
        throw createError(400, "Only JPEG, PNG, WebP, and PDF documents are allowed");
      }
      file.detectedExtension = detected.ext === "jpeg" ? "jpg" : detected.ext;
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

function ensureCloudinaryConfigured() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw createError(500, "Cloudinary environment variables are not configured");
  }
}

function uploadPrivateDocument(file, userId) {
  const publicId = `owner-applications/user-${userId}/${randomUUID()}.${file.detectedExtension}`;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: "raw", type: "authenticated" },
      (error, result) => {
        if (error) return reject(createError(502, "Document upload failed"));
        return resolve({ documentUrl: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(file.buffer);
  });
}

export async function uploadOwnerDocumentsToCloudinary(files, userId) {
  ensureCloudinaryConfigured();
  const uploaded = [];
  try {
    for (const file of files) uploaded.push(await uploadPrivateDocument(file, userId));
    return uploaded;
  } catch (error) {
    await deletePrivateOwnerDocuments(uploaded.map(({ publicId }) => publicId));
    throw error;
  }
}

export async function deletePrivateOwnerDocuments(publicIds) {
  const failedPublicIds = [];
  for (const publicId of publicIds.filter(Boolean)) {
    let deleted = false;
    for (let attempt = 1; attempt <= 3 && !deleted; attempt += 1) {
      try {
        const result = await cloudinary.uploader.destroy(publicId, {
          resource_type: "raw",
          type: "authenticated",
          invalidate: true,
        });
        deleted = ["ok", "not found"].includes(result.result);
      } catch {
        // Retry transient cleanup failures without logging sensitive identifiers.
      }
    }
    if (!deleted) failedPublicIds.push(publicId);
  }
  if (failedPublicIds.length) console.error("Private owner document cleanup failed", { count: failedPublicIds.length });
  return failedPublicIds;
}

export function createOwnerDocumentSignedUrl(publicId) {
  if (!publicId) return null;
  ensureCloudinaryConfigured();
  const extensionIndex = publicId.lastIndexOf(".");
  const format = extensionIndex > -1 ? publicId.slice(extensionIndex + 1) : "";
  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: "raw",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + OWNER_DOCUMENT_URL_TTL_SECONDS,
    attachment: false,
  });
}
