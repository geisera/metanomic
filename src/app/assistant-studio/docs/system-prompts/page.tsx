import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Metadata } from 'next';
import Link from 'next/link';
import Markdown from 'react-markdown';
import layout from '../../landing.module.css';
import s from './guide.module.css';

const filename = 'Assistant_Studio_System_Prompt_Guide.md';

export const metadata: Metadata = {
  title: 'System prompt guide for Assistant Studio',
  description: 'Write, test, and refine the instructions your Assistant Studio assistant follows. Includes a reusable template and a Preview checklist.',
};

export default async function SystemPromptGuide() {
  const guide = await readFile(join(process.cwd(), 'public', 'docs', filename), 'utf8');

  return <main className={layout.site}>
    <article className={s.guide} aria-label="Assistant Studio system prompt guide">
      <nav className={s.links} aria-label="Guide links">
        <Link href="/assistant-studio/docs">← Assistant Studio help</Link>
        <a href={'/docs/' + filename} download={filename}>Download Markdown</a>
      </nav>
      <Markdown skipHtml>{guide}</Markdown>
    </article>
  </main>;
}
