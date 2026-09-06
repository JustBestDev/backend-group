import assert from "node:assert/strict";
import test from "node:test";

import { reviewRentalRequestService } from "../src/services/rentalRequest.service.js";

function makeDatabase(options = {}) {
  let state = {
    users: [1, 2, 3, 99].map((id) => ({
      id,
      status: options.inactiveUserId === id ? "SUSPENDED" : "ACTIVE",
    })),
    property: {
      id: 10,
      ownerId: 99,
      rentType: options.rentType ?? "WHOLE_UNIT",
      monthlyRent: "12000.00",
      availableDate: null,
      deletedAt: options.deletedAt ?? null,
      publishStatus: options.publishStatus ?? "APPROVED",
      propertyStatus: options.propertyStatus ?? "AVAILABLE",
    },
    room: {
      id: 20,
      propertyId: 10,
      monthlyRent: "4500.00",
      status: options.roomStatus ?? "AVAILABLE",
      capacity: options.capacity ?? 3,
    },
    communityPost: options.community
      ? {
          id: 30,
          propertyId: 10,
          creatorId: 1,
          requiredMembers: options.requiredMembers ?? 2,
          status: options.communityStatus ?? "FULL",
          members: (options.communityMembers ?? [2, 3]).map((userId) => ({ userId })),
        }
      : null,
    rentalRequests: [
      {
        id: 40,
        propertyId: 10,
        roomId: options.rentType === "INDIVIDUAL_ROOM" ? 20 : null,
        requesterId: 1,
        communityPostId: options.community ? 30 : null,
        status: options.requestStatus ?? "PENDING",
        startDate: new Date("2026-10-01T00:00:00.000Z"),
        endDate: new Date("2027-09-30T00:00:00.000Z"),
        reviewedAt: null,
      },
      ...(options.competingRequest
        ? [{
            id: 41,
            propertyId: 10,
            roomId: options.rentType === "INDIVIDUAL_ROOM" ? 20 : null,
            requesterId: 2,
            communityPostId: null,
            status: "PENDING",
            startDate: new Date("2026-11-01T00:00:00.000Z"),
            endDate: null,
            reviewedAt: null,
          }]
        : []),
    ],
    rentals: options.existingRental
      ? [{ id: 1, propertyId: 10, roomId: options.rentType === "INDIVIDUAL_ROOM" ? 20 : null, status: "PENDING" }]
      : [],
  };
  let transactionQueue = Promise.resolve();

  const buildTransaction = (draft) => {
    const hydrateRequest = (request) => request && ({
      ...request,
      property: draft.property,
      room: request.roomId === draft.room.id ? draft.room : null,
      communityPost: request.communityPostId === draft.communityPost?.id
        ? draft.communityPost
        : null,
    });
    const matchesRequest = (request, where) =>
      (typeof where.id === "object" ? request.id !== where.id.not : request.id === where.id) &&
      (where.propertyId === undefined || request.propertyId === where.propertyId) &&
      (where.roomId === undefined || request.roomId === where.roomId) &&
      (where.status === undefined || request.status === where.status);

    return {
      rentalRequest: {
        findUnique: async ({ where }) => hydrateRequest(
          draft.rentalRequests.find((request) => request.id === where.id),
        ),
        updateMany: async ({ where, data }) => {
          const requests = draft.rentalRequests.filter((request) => matchesRequest(request, where));
          requests.forEach((request) => Object.assign(request, data));
          return { count: requests.length };
        },
      },
      user: {
        findMany: async ({ where }) => draft.users.filter(
          (user) => where.id.in.includes(user.id) && user.status === where.status,
        ),
      },
      rental: {
        findFirst: async ({ where }) => draft.rentals.find((rental) =>
          rental.propertyId === where.propertyId &&
          where.status.in.includes(rental.status) &&
          (!where.OR || where.OR.some((condition) => rental.roomId === condition.roomId)),
        ) ?? null,
        create: async ({ data }) => {
          const rental = {
            id: draft.rentals.length + 1,
            propertyId: data.propertyId,
            roomId: data.roomId,
            ownerId: data.ownerId,
            startDate: data.startDate,
            endDate: data.endDate,
            monthlyRent: data.monthlyRent,
            status: "PENDING",
            members: data.members.create.map(({ userId }) => ({ userId })),
          };
          draft.rentals.push(rental);
          return rental;
        },
      },
      room: {
        updateMany: async ({ where, data }) => {
          if (draft.room.id !== where.id || draft.room.status !== where.status) {
            return { count: 0 };
          }
          Object.assign(draft.room, data);
          return { count: 1 };
        },
      },
    };
  };

  return {
    get state() {
      return state;
    },
    async $transaction(callback) {
      let release;
      const previous = transactionQueue;
      transactionQueue = new Promise((resolve) => { release = resolve; });
      await previous;
      const draft = structuredClone(state);
      try {
        const result = await callback(buildTransaction(draft));
        state = draft;
        return result;
      } finally {
        release();
      }
    },
  };
}

const accept = (database, requestId = 40, ownerId = 99) =>
  reviewRentalRequestService(requestId, ownerId, "ACCEPT", database);

const rejectsWith = (promise, status, message) => assert.rejects(
  promise,
  (error) => error.status === status && error.message.includes(message),
);

test("accepts a direct whole-unit request and creates its rental", async () => {
  const database = makeDatabase();
  const request = await accept(database);

  assert.equal(request.status, "ACCEPTED");
  assert.equal(database.state.rentals.length, 1);
  assert.deepEqual(database.state.rentals[0].members, [{ userId: 1 }]);
});

test("accepts a direct individual-room request with room rent", async () => {
  const database = makeDatabase({ rentType: "INDIVIDUAL_ROOM" });
  await accept(database);

  assert.equal(database.state.rentals[0].roomId, 20);
  assert.equal(database.state.rentals[0].monthlyRent, "4500.00");
  assert.deepEqual(database.state.rentals[0].members, [{ userId: 1 }]);
  assert.equal(database.state.room.status, "RESERVED");
});

test("accepts a complete community with de-duplicated creator and members", async () => {
  const database = makeDatabase({
    community: true,
    communityMembers: [1, 2, 2, 3],
  });
  await accept(database);

  assert.deepEqual(
    database.state.rentals[0].members.map(({ userId }) => userId),
    [1, 2, 3],
  );
});

test("rejects an incomplete community", async () => {
  const database = makeDatabase({
    community: true,
    communityStatus: "OPEN",
    communityMembers: [2],
    requiredMembers: 2,
  });

  await rejectsWith(accept(database), 409, "not complete enough");
  assert.equal(database.state.rentals.length, 0);
});

test("rejects acceptance by the wrong owner", async () => {
  const database = makeDatabase();
  await rejectsWith(accept(database, 40, 98), 403, "your own properties");
});

test("manual rejection still rejects without creating a rental", async () => {
  const database = makeDatabase();
  const request = await reviewRentalRequestService(40, 99, "REJECT", database);

  assert.equal(request.status, "REJECTED");
  assert.equal(database.state.rentals.length, 0);
});

for (const status of ["ACCEPTED", "REJECTED"]) {
  test(`does not accept an already ${status.toLowerCase()} request`, async () => {
    const database = makeDatabase({ requestStatus: status });
    await rejectsWith(accept(database), 409, status);
  });
}

test("does not create a rental when a conflicting rental exists", async () => {
  const database = makeDatabase({ existingRental: true });
  await rejectsWith(accept(database), 409, "pending or active rental");
  assert.equal(database.state.rentals.length, 1);
});

test("does not create a rental when room capacity is exceeded", async () => {
  const database = makeDatabase({
    rentType: "INDIVIDUAL_ROOM",
    community: true,
    communityMembers: [2],
    requiredMembers: 1,
    capacity: 1,
  });
  await rejectsWith(accept(database), 400, "capacity");
  assert.equal(database.state.rentals.length, 0);
});

test("auto-rejects competing pending requests for the same target", async () => {
  const database = makeDatabase({ competingRequest: true });
  await accept(database);

  assert.equal(database.state.rentalRequests[1].status, "REJECTED");
  assert.ok(database.state.rentalRequests[1].reviewedAt instanceof Date);
});

test("allows only one of two concurrent accepts for the same target", async () => {
  const database = makeDatabase({ competingRequest: true });
  const results = await Promise.allSettled([
    accept(database, 40),
    accept(database, 41),
  ]);

  assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(database.state.rentals.length, 1);
});

test("rejects acceptance when the property became unavailable", async () => {
  const database = makeDatabase({ propertyStatus: "RENTED" });
  await rejectsWith(accept(database), 409, "Property is not available");
});

test("rejects acceptance when the room became unavailable", async () => {
  const database = makeDatabase({
    rentType: "INDIVIDUAL_ROOM",
    roomStatus: "RESERVED",
  });
  await rejectsWith(accept(database), 409, "Room is not available");
});

test("rejects acceptance when a rental member became inactive", async () => {
  const database = makeDatabase({ inactiveUserId: 1 });
  await rejectsWith(accept(database), 400, "not active");
});
