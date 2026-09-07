-- CreateTable
CREATE TABLE `RentalRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyId` INTEGER NOT NULL,
    `roomId` INTEGER NULL,
    `requesterId` INTEGER NOT NULL,
    `communityPostId` INTEGER NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,

    INDEX `RentalRequest_requesterId_propertyId_roomId_status_idx`(`requesterId`, `propertyId`, `roomId`, `status`),
    INDEX `RentalRequest_propertyId_status_createdAt_idx`(`propertyId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RentalRequest` ADD CONSTRAINT `RentalRequest_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RentalRequest` ADD CONSTRAINT `RentalRequest_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RentalRequest` ADD CONSTRAINT `RentalRequest_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RentalRequest` ADD CONSTRAINT `RentalRequest_communityPostId_fkey` FOREIGN KEY (`communityPostId`) REFERENCES `CommunityPost`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
