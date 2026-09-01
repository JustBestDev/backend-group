CREATE TABLE `RoomImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roomId` INTEGER NOT NULL,
    `imageUrl` VARCHAR(191) NOT NULL,
    `cloudinaryPublicId` VARCHAR(191) NULL,
    `isCover` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RoomImage_roomId_createdAt_idx`(`roomId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `RoomImage`
    ADD CONSTRAINT `RoomImage_roomId_fkey`
    FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
