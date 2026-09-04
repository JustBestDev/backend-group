# Rental API Postman tests

1. Start the API with `npm run dev`.
2. Import `rental-api.postman_collection.json` into Postman.
3. Edit the collection variables:
   - `ownerEmail` and `ownerPassword`: an active user with role `OWNER`.
   - `propertyId`: an `APPROVED` and `AVAILABLE` property owned by that account.
   - `memberId`: an active user who is not the property owner.
   - `startDate` and `endDate`: valid dates for the property.
4. The Create request is initially configured for `WHOLE_UNIT`. For an
   `INDIVIDUAL_ROOM` property, add `"roomId": {{roomId}}` to its JSON body and
   set `roomId` to an available room belonging to the property.
5. Run requests 01 through 06 in order, or run the collection. The login request
   stores `ownerToken`, and the create request stores `rentalId` automatically.

The main run creates a rental, activates it, and completes it. This changes local
database state. The validation examples should be run after request 06.

## Property collection

Import `property-api.postman_collection.json`, then set `ownerEmail`,
`ownerPassword`, `adminEmail`, and `adminPassword` in its collection variables.
The owner account must have role `OWNER`, and the admin account must have role
`ADMIN`. Requests 01-15 form one end-to-end flow and must run in order. The flow
creates a property, approves it, tests the public endpoints, and soft-deletes the
created property for cleanup.

The `Manual / optional tests` folder is not part of the ordered flow:

- Image upload requires selecting local image files in Postman and valid
  Cloudinary environment variables.
- Room creation is intended for a property whose `rentType` is
  `INDIVIDUAL_ROOM`.
- Run optional create/update requests before admin approval; these changes reset
  `publishStatus` to `PENDING`.
