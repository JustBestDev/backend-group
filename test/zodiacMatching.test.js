import assert from "node:assert/strict";
import test from "node:test";

import { getZodiacMatchesService } from "../src/services/community.service.js";

const getZodiacMatches = (userId, database, explanationGenerator = async () => null) =>
  getZodiacMatchesService(userId, database, explanationGenerator);

const birthdate = (value) => value && new Date(`${value}T00:00:00.000Z`);

const member = (id, date, memberRole = "MEMBER") => ({
  memberRole,
  user: {
    id,
    username: `user_${id}`,
    profile: {
      firstName: `User ${id}`,
      profileImageUrl: null,
      birthdate: birthdate(date),
    },
  },
});

const community = (id, members, status = "OPEN") => ({
  id,
  title: `Community ${id}`,
  description: "Zodiac matching test",
  requiredMembers: status === "FULL" ? 2 : 3,
  status,
  property: {
    id: id + 100,
    title: `Property ${id}`,
    monthlyRent: "7000.00",
    rentType: "INDIVIDUAL_ROOM",
    propertyType: "APARTMENT",
    images: [],
    address: null,
  },
  members,
});

function makeDatabase({ user = { id: 1, profile: { birthdate: birthdate("1998-03-12") } }, communities = [] } = {}) {
  const queries = {};
  return {
    queries,
    user: {
      findUnique: async (query) => {
        queries.user = query;
        return user;
      },
    },
    communityPost: {
      findMany: async (query) => {
        queries.communities = query;
        return communities;
      },
    },
  };
}

test("requires an existing user with a valid birthdate", async () => {
  await assert.rejects(
    getZodiacMatches(1, makeDatabase({ user: null })),
    (error) => error.status === 404 && error.message === "User not found",
  );

  for (const profile of [null, { birthdate: null }, { birthdate: new Date("invalid") }]) {
    await assert.rejects(
      getZodiacMatches(1, makeDatabase({ user: { id: 1, profile } })),
      (error) =>
        error.status === 400 &&
        error.message === "Birthdate is required for zodiac matching",
    );
  }
});

test("averages valid members while skipping missing birthdates and the current user", async () => {
  const database = makeDatabase({
    communities: [
      community(1, [member(2, "1998-07-10"), member(3, "1998-11-15")]),
      community(2, [member(2, "1998-07-10"), member(4, null)]),
      community(3, [member(4, null)]),
      community(4, [member(1, "1998-03-12", "CREATOR"), member(2, "1998-07-10")]),
    ],
  });

  const result = await getZodiacMatches(1, database);
  const byId = new Map(result.matches.map((match) => [match.id, match]));

  assert.equal(result.userZodiac, "PISCES");
  assert.equal(byId.get(1).compatibilityScore, 95);
  assert.equal(byId.get(1).matchedMembers, 2);
  assert.equal(byId.get(1).members[0].compatibility.score, 95);
  assert.ok(Array.isArray(byId.get(1).members[0].compatibility.reasons));
  assert.deepEqual(byId.get(1).compatibilityReasons, [
    "Same water element",
    "Different modalities can balance each other",
    "Shared receptive polarity",
    "Trine sign relationship",
  ]);
  assert.ok(byId.get(1).compatibilityReasons.length <= 4);
  assert.equal(byId.get(2).compatibilityScore, 95);
  assert.equal(byId.get(2).matchedMembers, 1);
  assert.equal(byId.get(2).totalMembers, 2);
  assert.equal(byId.get(2).members[1].compatibility, null);
  assert.equal(byId.get(3).compatibilityScore, null);
  assert.deepEqual(byId.get(3).compatibilityReasons, []);
  assert.equal(byId.get(3).matchedMembers, 0);
  assert.equal(byId.get(4).compatibilityScore, 95);
  assert.equal(byId.get(4).isMember, true);
  assert.equal(byId.get(4).matchedMembers, 1);
  assert.equal(byId.get(4).members[0].compatibility, null);
  assert.equal("birthdate" in byId.get(1).members[0].user.profile, false);
  assert.equal(byId.get(1).members[0].user.profile.zodiac, "CANCER");
});

test("sorts scores descending, puts null last, breaks ties by id, and retains FULL posts", async () => {
  const database = makeDatabase({
    communities: [
      community(9, [member(2, null)]),
      community(7, [member(3, "1998-06-10")]),
      community(5, [member(4, "1998-07-10")]),
      community(2, [member(5, "1998-07-10")], "FULL"),
    ],
  });

  const { matches } = await getZodiacMatches(1, database);

  assert.deepEqual(matches.map(({ id }) => id), [2, 5, 7, 9]);
  assert.equal(matches[0].status, "FULL");
  assert.equal(matches.at(-1).compatibilityScore, null);
});

test("queries only eligible properties and excludes CLOSED communities", async () => {
  const database = makeDatabase();
  await getZodiacMatches(1, database);

  assert.deepEqual(database.queries.communities.where, {
    status: { not: "CLOSED" },
    property: {
      deletedAt: null,
      publishStatus: "APPROVED",
      propertyStatus: "AVAILABLE",
    },
  });
  assert.deepEqual(database.queries.user.select, {
    id: true,
    profile: { select: { birthdate: true } },
  });
});

test("adds cached AI explanations without changing deterministic matching", async () => {
  const database = makeDatabase({
    communities: [
      community(1, [member(2, "1998-07-10")]),
      community(2, [member(3, "1998-07-10")]),
    ],
  });
  const calls = [];
  const explanation = {
    summary: "A potentially comfortable roommate dynamic.",
    reasons: ["Both may value emotional awareness.", "Different habits can balance daily routines."],
  };

  const result = await getZodiacMatches(1, database, async (input) => {
    calls.push(input);
    return explanation;
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(Object.keys(calls[0]).sort(), [
    "compatibilityReasons",
    "compatibilityScore",
    "memberZodiacs",
    "userZodiac",
  ]);
  assert.deepEqual(result.matches.map(({ aiExplanation }) => aiExplanation), [
    explanation,
    explanation,
  ]);
  assert.equal(result.matches[0].compatibilityScore, 95);
});

test("falls back when AI explanation generation fails", async () => {
  const database = makeDatabase({
    communities: [community(1, [member(2, "1998-07-10")])],
  });
  const { matches } = await getZodiacMatches(1, database, async () => {
    throw new Error("OpenAI unavailable");
  });

  assert.equal(matches[0].aiExplanation, null);
  assert.ok(matches[0].compatibilityReasons.length > 0);
});
