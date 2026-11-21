export const emailSteps = {
 welcome: 'Welcome email', create: 'Reminder · Create an assistant', key: 'Reminder · Connect a key',
 knowledge: 'Reminder · Add knowledge', preview: 'Reminder · Try Preview', embed: 'Reminder · Publish and embed',
} as const;
export type Step = keyof typeof emailSteps;
export type EmailTemplate = {step: Step; subject: string; body: string; label: string; version: number};
