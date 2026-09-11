import assert from "node:assert/strict";
import test from "node:test";

import {
  createCommunityPostService,
  ensureCommunityPostListingIsAvailable,
  getAllCommunitiesService,
} from "../src/services/community.service.js";
import { communityPostSchema } from "../src/validations/schema.js";

const postData = {
  propertyId: 12,
  title: "Room B roommates",
  description: "",
  requiredMembers: 2,
};

const makeDatabase = ({ room = { id: 9, propertyId: 12 } } = {}) => {
  const creates = [];
  return {
    creates,
    property: {
      findFirst: async () => ({ id: 12, rentType: "INDIVIDUAL_ROOM" }),
    },
    room: { findUnique: async () => room },
    rental: { findFirst: async () => null },
    communityPost: {
      create: async (query) => {
        creates.push(query);
        return { id: 1, room: query.data.room ? { id: 9, roomName: "Room B", images: [] } : null };
      },
      findMany: async () => [{
        id: 1,
        propertyId: 12,
        roomId: 9,
        room: { id: 9, roomName: "Room B", monthlyRent: "9000", status: "AVAILABLE", capacity: 2, images: [] },
      }],
    },
  };
};

test("property-only Community posts remain valid and omit the room relation", async () => {
  assert.equal(communityPostSchema.parse(postData).roomId, undefined);
  const database = makeDatabase();
  await createCommunityPostService(postData, 7, database);
  assert.equal("room" in database.creates[0].data, false);
});

test("room-linked Community posts connect the validated room", async () => {
  const database = makeDatabase();
  const created = await createCommunityPostService({ ...postData, roomId: 9 }, 7, database);
  assert.deepEqual(database.creates[0].data.room, { connect: { id: 9 } });
  assert.equal(created.room.roomName, "Room B");
});

test("invalid and mismatched Community room references are rejected", async () => {
  await assert.rejects(
    ensureCommunityPostListingIsAvailable(12, 999, makeDatabase({ room: null })),
    (error) => error.status === 404 && error.message === "Room not found",
  );
  await assert.rejects(
    ensureCommunityPostListingIsAvailable(12, 9, makeDatabase({ room: { id: 9, propertyId: 13 } })),
    (error) => error.status === 400 && /does not belong/.test(error.message),
  );
});

test("Community listing responses include compact room data", async () => {
  const posts = await getAllCommunitiesService(makeDatabase());
  assert.deepEqual(posts[0].room, {
    id: 9,
    roomName: "Room B",
    monthlyRent: "9000",
    status: "AVAILABLE",
    capacity: 2,
    images: [],
  });
});
