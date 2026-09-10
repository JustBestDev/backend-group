import assert from "node:assert/strict";
import test from "node:test";

import { generateZodiacExplanation } from "../src/services/openai.service.js";

const match = {
  userZodiac: "PISCES",
  memberZodiacs: ["CANCER"],
  compatibilityScore: 95,
  compatibilityReasons: ["Same water element"],
};

test("sends only non-sensitive match data and validates the response", async () => {
  const expected = {
    summary: "This pairing may feel naturally supportive.",
    reasons: ["Both may communicate with empathy.", "Their routines can complement each other."],
  };
  let capturedRequest;
  let capturedOptions;
  const fakeOpenAI = {
    responses: {
      create: async (request, options) => {
        capturedRequest = request;
        capturedOptions = options;
        return { output_text: JSON.stringify(expected) };
      },
    },
  };

  assert.deepEqual(await generateZodiacExplanation(match, fakeOpenAI), expected);
  assert.equal(capturedRequest.model, "gpt-5.6-luna");
  assert.equal(capturedRequest.store, false);
  assert.deepEqual(JSON.parse(capturedRequest.input), {
    userZodiac: "PISCES",
    memberZodiacs: ["CANCER"],
    compatibilityScore: 95,
    deterministicReasons: ["Same water element"],
  });
  assert.deepEqual(capturedOptions, { timeout: 4_000, maxRetries: 0 });
});

test("returns null for missing clients, request failures, and invalid output", async () => {
  assert.equal(await generateZodiacExplanation(match, null), null);
  assert.equal(
    await generateZodiacExplanation(match, {
      responses: { create: async () => { throw new Error("timeout"); } },
    }),
    null,
  );
  assert.equal(
    await generateZodiacExplanation(match, {
      responses: { create: async () => ({ output_text: "{}" }) },
    }),
    null,
  );
});
