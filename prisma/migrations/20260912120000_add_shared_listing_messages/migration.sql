ALTER TABLE `Message`
  MODIFY `message` TEXT NULL,
  ADD COLUMN `type` ENUM('TEXT', 'PROPERTY_SHARE', 'ROOM_SHARE') NOT NULL DEFAULT 'TEXT',
  ADD COLUMN `sharedPropertyId` INTEGER NULL,
  ADD COLUMN `sharedRoomId` INTEGER NULL;

CREATE INDEX `Message_sharedPropertyId_idx` ON `Message`(`sharedPropertyId`);
CREATE INDEX `Message_sharedRoomId_idx` ON `Message`(`sharedRoomId`);

ALTER TABLE `Message`
  ADD CONSTRAINT `Message_sharedPropertyId_fkey`
    FOREIGN KEY (`sharedPropertyId`) REFERENCES `Property`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Message_sharedRoomId_fkey`
    FOREIGN KEY (`sharedRoomId`) REFERENCES `Room`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
