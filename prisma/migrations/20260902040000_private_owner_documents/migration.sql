CREATE TABLE `OwnerApplicationDocument` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ownerApplicationId` INTEGER NOT NULL,
    `documentUrl` VARCHAR(191) NOT NULL,
    `cloudinaryPublicId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OwnerApplicationDocument_ownerApplicationId_createdAt_idx`(`ownerApplicationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Preserve legacy URLs before removing the old single-document column. The old
-- schema did not store Cloudinary public IDs, so that value remains truthfully NULL.
INSERT INTO `OwnerApplicationDocument` (`ownerApplicationId`, `documentUrl`, `cloudinaryPublicId`)
SELECT `id`, `documentUrl`, NULL
FROM `OwnerApplication`
WHERE `documentUrl` IS NOT NULL;

ALTER TABLE `OwnerApplicationDocument`
    ADD CONSTRAINT `OwnerApplicationDocument_ownerApplicationId_fkey`
    FOREIGN KEY (`ownerApplicationId`) REFERENCES `OwnerApplication`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `OwnerApplication` DROP COLUMN `documentUrl`;
