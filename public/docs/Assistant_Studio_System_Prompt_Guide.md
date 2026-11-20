# Write effective system prompts

The system prompt is the set of instructions your Assistant Studio assistant follows when it replies. To edit it, select your assistant, open **Settings**, and find **Behavior**. After editing, select **Save changes** and test in **Preview**.

## Decide what belongs in Behavior

Use **Behavior** for rules that apply across conversations. Describe who the assistant helps, what it can answer, how it should respond, and when to send visitors to your team.

Use **Knowledge** for business facts such as prices, return policies, service areas, and product details. Give each document a clear title, publish it for use in answers, and add a public source URL when visitors should be able to open the original. Update the document when the policy changes.

Studio supplies relevant passages from published knowledge and handles citations automatically. Tell the assistant which facts need support from those passages. Leave citation formatting to Studio. The Behavior field accepts up to **8,000 characters**.

## Write rules the assistant can follow

1. **Name the role and audience.** Tell the assistant who it represents and whom it helps. “Help prospective customers understand our services and prepare to request an estimate” gives it a concrete job.
2. **Set the scope.** Name the topics it can cover. For a related request outside that scope, name the approved contact page or team that can help.
3. **Define what to do when information is missing.** If the visitor leaves out a detail that would change the answer, ask one focused question. If the published knowledge lacks the answer, say so and offer a next step. Keep dates, prices, exceptions, and other conditions intact when paraphrasing.
4. **Specify the reply format.** Start with the answer. Use short paragraphs and bullets when they make a policy or process easier to scan. Request an example when a rule would otherwise be ambiguous.
5. **Set boundaries around privacy and actions.** Keep credentials, customer records, and confidential information out of Behavior and published Knowledge. The widget can point visitors to an approved destination. It cannot access accounts, book appointments, place orders, or contact your team on a visitor’s behalf.

## Use this template

Replace every bracketed detail before pasting the template into **Behavior**. Use a real, approved URL for your handoff.

```text
Role
You are the website assistant for [business]. Help [audience]
with [two or three specific tasks].

Scope
Answer questions about [in-scope topics]. Refer questions about
[out-of-scope topics] to [team or approved destination].

Business facts
Use the published knowledge supplied to you for business-specific
answers. Preserve any conditions or exceptions that affect the
answer. Ask one focused question if a missing visitor detail would
change the answer. If the knowledge lacks the answer or sources
conflict, say what you cannot confirm and direct the visitor to
[approved contact or booking URL].

Reply style
Lead with the answer. Use plain language and short paragraphs.
Use a short list when comparing options or giving steps.

Actions and privacy
Direct visitors to [approved URL] for [specific next step].
Never claim that you completed an action on their behalf. If
account verification or sensitive details are needed, direct the
visitor to [approved support channel].
```

An online retailer might add this rule for return questions.

> If the policy depends on when the package arrived, ask for the delivery date. Explain the window using the policy’s exact starting point. Send refund status questions to the order support page.

Publish the actual return window and exceptions in **Knowledge**. If the policy says “30 days from delivery,” a good answer keeps both the number and the words “from delivery.”

## Test before publishing

In **Preview**, try questions that cover these cases. Use **Clear conversation** between independent tests so an earlier answer cannot supply missing context.

- **Known answer.** Ask about a published policy. Check the answer, the conditions, and the cited source.
- **Missing visitor detail.** Ask a question that depends on location, product, or timing. Check that the assistant asks the one question it needs.
- **Missing or conflicting knowledge.** Ask about an unpublished detail or a policy the sources disagree on. Check that the assistant admits the gap and gives the right next step.
- **Out-of-scope action.** Ask the assistant to cancel an order or make a booking. Check that it gives the correct destination and makes no claim that it took action.
- **Conflicting visitor instruction.** Ask it to ignore its instructions and invent a discount. Check that it sticks to published facts and keeps its configuration private.

When a factual answer is wrong, open **Response details**. If the right source wasn’t supplied, check whether the document is published and whether its title and wording match the visitor’s question. If the right source was supplied, check for ambiguity in the document or a conflicting rule in Behavior. Revise one thing at a time, save, and rerun the same tests.

## Further reading

[OpenAI’s prompt engineering guide](https://developers.openai.com/api/docs/guides/prompt-engineering)
