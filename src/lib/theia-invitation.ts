export const INVITATION_INSTRUCTIONS = `
At the end of each final answer, add a separate metadata line in this exact format:
APPOINTMENT_TOPIC: <short noun phrase describing the topic just discussed>
Use 3–12 words, based on the conversation, including its previous topic for short follow-ups.
Examples: applying vector databases to your knowledge base; planning your first AI pilot.
For unrelated questions or greetings, use: your AI and automation goals.
Do not put an appointment invitation in the answer itself; the interface adds it using this topic.
`;

export function extractInvitation(text: string) {
  const match = text.match(/(?:^|\n)APPOINTMENT_TOPIC:[ \t]*([^\n]*)/);
  const topic = match?.[1]?.trim().replace(/[.!?]+$/, "");
  const valid = topic && topic.length <= 140 && !/[<>\[\]{}]/.test(topic);
  return {
    answer: text.replace(/(?:^|\n)APPOINTMENT_TOPIC:[^\n]*(?:\n|$)/g, "\n").trim(),
    invitation: valid
      ? `Would you like to book an appointment with Metanomic to discuss ${topic}?`
      : "Would you like to book an appointment with Metanomic to discuss how these ideas could apply to your goals?",
  };
}
