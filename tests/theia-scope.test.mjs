import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyScope, hasPertinentPublishedEvidence, hasProfessionalFollowUp, hasBusinessDiscussionIntent, outOfScopeReply } from "../src/lib/theia-scope.ts";

const bellwether = {
  title: "TEST FICTION — The Kingdom of Bellwether Hollow",
  excerpt: "Queen Maribel the Uncrowned rules Bellwether Hollow. The kingdom's capital is Thimblewick. During Hush, no new promises are allowed. The Crumb Collector gathers forgotten promises.",
};

describe("Theia Balanced scope policy", () => {
  const cases = [
    ["How can AI improve Salesforce workflows?", "core"],
    ["What is RAG?", "core"],
    ["What are tokens?", "core"],
    ["What are tokens in AI?", "core"],
    ["What is a context window?", "core"],
    ["What's an agent?", "core"],
    ["What is a vector?", "core"],
    ["What is inference?", "core"],
    ["What's a hallucination?", "core"],
    ["What is fine tuning?", "core"],
    ["What are embeddings?", "core"],
    ["What is temperature?", "core"],
    ["How do tokenizers work?", "core"],
    ["What is the temperature in Paris?", "review"],
    ["What about subway tokens?", "review"],
    ["What is model temperature?", "core"],
    ["How could a baseball team use AI for scouting?", "core"],
    ["Can I use an AI agent to write novels?", "core"],
    ["How would AI assess election polling quality?", "core"],
    ["Explain the limitations of Theia's technology stack.", "core"],
    ["What AI governance practices matter for customer data?", "core"],
    ["Hello", "smalltalk"],
    ["Thanks!", "smalltalk"],
    ["Who won the 1986 World Series?", "out_of_scope"],
    ["What was the final score?", "out_of_scope"],
    ["Give me a pasta recipe.", "out_of_scope"],
    ["How do I make a mocha latte?", "out_of_scope"],
    ["How can I make a cappuccino at home?", "out_of_scope"],
    ["How to brew iced coffee?", "out_of_scope"],
    ["How do you bake bread?", "out_of_scope"],
    ["How do I prepare a smoothie?", "out_of_scope"],
    ["How can AI improve coffee-shop order workflows?", "core"],
    ["Write a fantasy novel.", "out_of_scope"],
    ["Who is the president?", "out_of_scope"],
    ["What's the capital of France?", "out_of_scope"],
    ["What happens in the movie ending?", "out_of_scope"],
    ["What is 28 + 36?", "out_of_scope"],
    ["Could this help my team?", "review"],
    ["And what would that involve?", "review"],
  ];
  for (const [query, expected] of cases) {
    it(`${query} → ${expected}`, () => {
      assert.equal(classifyScope(query), expected);
    });
  }
});

describe("Approved document exception", () => {
  const questions = [
    "Who rules Bellwether Hollow?",
    "Who is Queen Maribel?",
    "What is the capital of Bellwether Hollow?",
    "What happens during Hush?",
    "Who is the Crumb Collector?",
  ];
  for (const query of questions) {
    it(`accepts: ${query}`, () => {
      assert.equal(hasPertinentPublishedEvidence(query, [bellwether]), true);
      assert.equal(classifyScope(query, [bellwether]), "knowledge");
    });
  }
  it("rejects unrelated weak semantic hits", () => {
    assert.equal(hasPertinentPublishedEvidence("Who won the World Series?", [bellwether]), false);
    assert.equal(classifyScope("Who won the World Series?", [bellwether]), "out_of_scope");
  });
  it("does not authorize unpublished or absent evidence", () => {
    assert.equal(classifyScope("Who rules Bellwether Hollow?"), "review");
  });
  it("does not treat a generic word alone as approved evidence", () => {
    assert.equal(hasPertinentPublishedEvidence("What is the capital of Japan?", [bellwether]), false);
    assert.equal(classifyScope("What is the capital of Japan?", [bellwether]), "out_of_scope");
  });
});

describe("Gentle scope redirects without unnecessary sales pitches", () => {
  const scenarios = [
    ["Who won the 1986 World Series?", "sports"],
    ["Write a fantasy novel.", "writing"],
    ["Give me a pasta recipe.", "hospitality"],
    ["How do I make a mocha latte?", "hospitality"],
    ["What is the capital of France?", "business"],
  ];
  for (const [prompt, context] of scenarios) {
    it(`gently redirects ${context} request`, () => {
      const reply = outOfScopeReply(prompt);
      assert.match(reply, /a little outside my specialty/i);
      assert.match(reply, /AI/i);
      assert.doesNotMatch(reply, /no-obligation discussion/i);
      if (context === "sports") assert.match(reply, /analytics or operations in sports/i);
      if (context === "writing") assert.match(reply, /writing or publishing workflows/i);
      if (context === "hospitality") assert.match(reply, /hospitality or food-service workflow/i);
      assert.ok(reply.length < 500);
    });
  }
});

describe("Conversation continuity and selective consultation", () => {
  const history = [
    { role: "user", content: "What are tokens?" },
    { role: "assistant", content: "In AI, tokens are pieces of text processed by the model." },
    { role: "user", content: "What does it cost?" },
  ];
  it("carries professional context into elliptical follow-ups", () => {
    assert.equal(hasProfessionalFollowUp("What does it cost?", history), true);
    assert.equal(hasProfessionalFollowUp("Can you explain that further?", [
      history[0], history[1], { role: "user", content: "Can you explain that further?" },
    ]), true);
  });
  it("does not inherit context for an explicit topic change", () => {
    assert.equal(hasProfessionalFollowUp("How do I make a mocha latte?", [
      ...history.slice(0, 2), { role: "user", content: "How do I make a mocha latte?" },
    ]), false);
  });
  it("does not inherit an out-of-scope discussion", () => {
    assert.equal(hasProfessionalFollowUp("What does it cost?", [
      { role: "user", content: "How do I make a mocha latte?" },
      { role: "assistant", content: "That's outside my specialty." },
      { role: "user", content: "What does it cost?" },
    ]), false);
  });
  it("does not advertise during a basic technical definition", () => {
    assert.equal(hasBusinessDiscussionIntent("What are tokens?"), false);
    assert.equal(hasBusinessDiscussionIntent("What is RAG?"), false);
    assert.equal(hasBusinessDiscussionIntent("How do vector embeddings work?"), false);
  });
  it("offers contact on real implementation needs", () => {
    assert.equal(hasBusinessDiscussionIntent("Our team needs an AI workflow pilot"), true);
    assert.equal(hasBusinessDiscussionIntent("What would implementation cost?"), true);
    assert.equal(hasBusinessDiscussionIntent("My company wants to deploy agents"), true);
  });
});
