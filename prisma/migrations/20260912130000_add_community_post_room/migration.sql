ALTER TABLE `CommunityPost` ADD COLUMN `roomId` INTEGER NULL;

CREATE INDEX `CommunityPost_roomId_idx` ON `CommunityPost`(`roomId`);

ALTER TABLE `CommunityPost`
  ADD CONSTRAINT `CommunityPost_roomId_fkey`
    FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
