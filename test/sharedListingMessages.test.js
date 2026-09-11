import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../src/lib/prisma.js";
import {
  createConversationMessage,
  findMessagesByConversationId,
} from "../src/services/conversation.service.js";
import {
  requireConversationMembership,
  requireShareableListing,
  validateMessagePayload,
} from "../src/controllers/conversation.controller.js";

test("TEXT messages remain backward-compatible", () => {
  assert.deepEqual(validateMessagePayload({ message: " Hello " }), {
    message: "Hello", type: "TEXT", propertyId: null, roomId: null,
  });
  assert.throws(() => validateMessagePayload({ message: "  " }), /Message is required/);
});

test("PROPERTY_SHARE and ROOM_SHARE payloads accept optional text", () => {
  assert.deepEqual(validateMessagePayload({ type: "PROPERTY_SHARE", propertyId: "12" }), {
    message: null, type: "PROPERTY_SHARE", propertyId: 12, roomId: null,
  });
  assert.deepEqual(validateMessagePayload({ type: "ROOM_SHARE", roomId: 9, message: " What about this room? " }), {
    message: "What about this room?", type: "ROOM_SHARE", propertyId: null, roomId: 9,
  });
});

test("invalid listing IDs and message types are rejected", () => {
  assert.throws(() => validateMessagePayload({ type: "PROPERTY_SHARE", propertyId: 0 }), /Invalid property ID/);
  assert.throws(() => validateMessagePayload({ type: "ROOM_SHARE", roomId: "nope" }), /Invalid room ID/);
  assert.throws(() => validateMessagePayload({ type: "VIDEO" }), /Invalid message type/);
});

test("missing or unavailable listing records are rejected", async () => {
  await assert.rejects(
    requireShareableListing({ type: "PROPERTY_SHARE", propertyId: 999 }, async () => null),
    (error) => error.status === 404 && /Property/.test(error.message),
  );
  await assert.rejects(
    requireShareableListing({ type: "ROOM_SHARE", roomId: 999 }, async () => ({}), async () => null),
    (error) => error.status === 404 && /Room/.test(error.message),
  );
});

test("unauthorized conversation access is rejected", () => {
  assert.throws(
    () => requireConversationMembership(null),
    (error) => error.status === 403 && /not a member/.test(error.message),
  );
  assert.doesNotThrow(() => requireConversationMembership({ conversationId: 1, userId: 2 }));
});

test("shared-message creation stores relational IDs and returns hydrated data", async () => {
  const originalTransaction = prisma.$transaction;
  const writes = [];
  prisma.$transaction = async (callback) => callback({
    message: {
      create: async ({ data }) => {
        writes.push(data);
        return {
          id: 5,
          ...data,
          sharedProperty: data.sharedPropertyId
            ? { id: data.sharedPropertyId, title: "Forest House", monthlyRent: "12000", deletedAt: null, images: [] }
            : null,
          sharedRoom: data.sharedRoomId
            ? { id: data.sharedRoomId, roomName: "Sage Room", monthlyRent: "4500", property: { id: 12, title: "Forest House", deletedAt: null }, images: [] }
            : null,
        };
      },
    },
    conversation: { update: async () => ({}) },
  });

  try {
    const propertyMessage = await createConversationMessage(1, 2, {
      message: null, type: "PROPERTY_SHARE", propertyId: 12, roomId: null,
    });
    const roomMessage = await createConversationMessage(1, 2, {
      message: "Look", type: "ROOM_SHARE", propertyId: null, roomId: 9,
    });
    assert.equal(writes[0].sharedPropertyId, 12);
    assert.equal(propertyMessage.sharedProperty.title, "Forest House");
    assert.equal(writes[1].sharedRoomId, 9);
    assert.equal(roomMessage.sharedRoom.property.id, 12);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("message history returns hydrated listings and hides deleted ones", async () => {
  const originalFindMany = prisma.message.findMany;
  prisma.message.findMany = async () => [
    { id: 1, type: "PROPERTY_SHARE", sharedProperty: { id: 12, title: "Home", deletedAt: null }, sharedRoom: null },
    { id: 2, type: "ROOM_SHARE", sharedProperty: null, sharedRoom: { id: 9, property: { id: 12, title: "Home", deletedAt: new Date() } } },
  ];
  try {
    const messages = await findMessagesByConversationId(1);
    assert.equal(messages[0].sharedProperty.title, "Home");
    assert.equal(messages[0].sharedProperty.deletedAt, undefined);
    assert.equal(messages[1].sharedRoom, null);
  } finally {
    prisma.message.findMany = originalFindMany;
  }
});
