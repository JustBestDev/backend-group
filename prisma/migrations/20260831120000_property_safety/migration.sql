-- Preserve Property history with soft deletion and retain Cloudinary asset IDs.
ALTER TABLE `Property`
    ADD COLUMN `deletedAt` DATETIME(3) NULL;

ALTER TABLE `PropertyImage`
    ADD COLUMN `cloudinaryPublicId` VARCHAR(191) NULL;

CREATE INDEX `Property_deletedAt_publishStatus_createdAt_idx`
    ON `Property`(`deletedAt`, `publishStatus`, `createdAt`);

CREATE INDEX `PropertyImage_propertyId_createdAt_idx`
    ON `PropertyImage`(`propertyId`, `createdAt`);
