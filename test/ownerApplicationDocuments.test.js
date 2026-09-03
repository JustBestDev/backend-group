import assert from "node:assert/strict";
import test from "node:test";

import {
  assertOwnerApplicationDocumentLimit,
  createOwnerDocumentSignedUrl,
  deletePrivateOwnerDocuments,
  OWNER_DOCUMENT_URL_TTL_SECONDS,
  validateOwnerApplicationDocuments,
} from "../src/utils/uploadCloudOwnerApplication.js";

test("enforces the five-document total for appended owner documents", () => {
  assert.doesNotThrow(() => assertOwnerApplicationDocumentLimit(2, 1));
  assert.throws(
    () => assertOwnerApplicationDocumentLimit(4, 2),
    (error) => error.status === 400 && /no more than 5/.test(error.message)
  );
});

const runValidation = (files) =>
  new Promise((resolve) => {
    validateOwnerApplicationDocuments({ files }, {}, (error) => resolve(error));
  });

test("accepts file content identified as JPEG and PDF", async () => {
  const jpeg = Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EB//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EB//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EB//2Q==",
    "base64"
  );
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
  const files = [{ buffer: jpeg }, { buffer: pdf }];

  assert.equal(await runValidation(files), undefined);
  assert.deepEqual(files.map((file) => file.detectedExtension), ["jpg", "pdf"]);
});

test("rejects missing and spoofed document content", async () => {
  const missingError = await runValidation([]);
  const spoofedError = await runValidation([
    { buffer: Buffer.from("not actually a jpeg"), mimetype: "image/jpeg" },
  ]);

  assert.equal(missingError.status, 400);
  assert.equal(spoofedError.status, 400);
});

for (const [format, publicId] of [
  ["jpg", "owner-applications/user-1/photo.jpg"],
  ["webp", "owner-applications/user-2/photo.webp"],
  ["pdf", "owner-applications/user-3/document.pdf"],
]) {
  test(`creates a signed authenticated raw URL for a ${format} public ID including its extension`, () => {
    const before = Math.floor(Date.now() / 1000);
    const signedUrl = createOwnerDocumentSignedUrl(publicId);
    const parsedUrl = new URL(signedUrl);
    const expiresAt = Number(parsedUrl.searchParams.get("expires_at"));

    assert.ok(parsedUrl.pathname.endsWith("/raw/download"));
    assert.equal(parsedUrl.searchParams.get("public_id"), publicId);
    assert.equal(parsedUrl.searchParams.get("format"), format);
    assert.equal(parsedUrl.searchParams.get("type"), "authenticated");
    assert.ok(parsedUrl.searchParams.get("signature"));
    assert.ok(expiresAt >= before + OWNER_DOCUMENT_URL_TTL_SECONDS);
    assert.ok(expiresAt <= before + OWNER_DOCUMENT_URL_TTL_SECONDS + 1);
  });
}

test("legacy documents without a Cloudinary public ID are handled safely", async () => {
  assert.equal(createOwnerDocumentSignedUrl(null), null);
  assert.deepEqual(await deletePrivateOwnerDocuments([null, undefined, ""]), []);
});
