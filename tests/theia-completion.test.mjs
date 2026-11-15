import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CONTINUATION_LIMIT, RESPONSE_CHAR_LIMIT, isTokenLimited, joinContinuation, finalizeAnswer } from "../src/lib/theia-completion.ts";

describe("Theia completion safeguards", () => {
  it("recognizes token budget exhaustion only", () => {
    assert.equal(isTokenLimited("length"), true);
    assert.equal(isTokenLimited("stop"), false);
    assert.equal(isTokenLimited("tool_calls"), false);
  });
  it("bounds continuation attempts", () => {
    assert.equal(CONTINUATION_LIMIT, 1);
  });
  it("joins non-overlapping text", () => {
    assert.equal(joinContinuation("First, check your data.", "Then pilot the model."), "First, check your data. Then pilot the model.");
  });
  it("removes repeated overlapping text", () => {
    assert.equal(joinContinuation("A plan has three steps: choose a pilot", "choose a pilot, assign owners, and test."), "A plan has three steps: choose a pilot, assign owners, and test.");
  });
  it("does not repeat an already included continuation", () => {
    assert.equal(joinContinuation("A complete answer.", "A complete answer."), "A complete answer.");
  });
  it("preserves a complete response", () => {
    assert.deepEqual(finalizeAnswer("Done.", true), { answer: "Done.", incomplete: false });
  });
  it("explicitly labels exhausted replies", () => {
    const out = finalizeAnswer("3) Prepare", false);
    assert.equal(out.incomplete, true);
    assert.match(out.answer, /Response incomplete/);
  });
  it("does not silently truncate long output", () => {
    const out = finalizeAnswer("A".repeat(RESPONSE_CHAR_LIMIT + 100), true);
    assert.equal(out.incomplete, true);
    assert.match(out.answer, /Response incomplete/);
  });
});
