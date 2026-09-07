-- Support conversations are direct owner/admin threads and do not belong to a property.
ALTER TABLE `Conversation` MODIFY `propertyId` INTEGER NULL;
