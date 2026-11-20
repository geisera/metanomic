import Link from 'next/link';
import s from '../studio.module.css';

export const metadata = { title: 'Assistant Studio Privacy Policy' };

const dataCategories = [
  ['Account and authentication', 'Your email address, display name if provided, account ID, and authentication records. We use this information to create and secure your account, verify your email, help you recover access, and send account notices.'],
  ['Terms acceptance', 'Your account ID, the version of the Terms you accepted, and the acceptance timestamp. We use this record to document your agreement.'],
  ['Assistant settings and knowledge', 'Your assistant’s name, instructions, appearance settings, approved website addresses, uploaded or pasted documents, and any public source URLs you add. We use this information to configure and operate your assistant.'],
  ['OpenAI API key', 'If you connect a key, we store it in encrypted form. Our server uses it to validate the connection and make model requests on your behalf. The key is not included in your embed code or visible to chat visitors.'],
  ['Chat messages and replies', 'We process messages and recent conversation context to generate replies in Preview and the embedded chat. See Section 2 for what is sent to OpenAI and how conversations are handled.'],
  ['Usage and technical information', 'Daily request and failure counts, usage-alert settings and delivery records, and technical information needed to load and protect the service. This can include IP addresses, website origins, and hashed rate-limit identifiers. We use this information to enforce limits, prevent abuse, troubleshoot errors, and show usage in Studio.'],
  ['Support and waitlist information', 'If you contact us, we receive the information you choose to send. If you join a waitlist, we use your email address to manage that request and notify you about the plan you selected.'],
];

export default function Privacy() {
  return <main className={s.shell}>
    <article className="container mx-auto max-w-3xl space-y-8 py-16 leading-relaxed">
      <header className={s.intro}>
        <p className="eyebrow">Assistant Studio</p>
        <h1>Assistant Studio Privacy Policy</h1>
        <p><strong>Effective date:</strong> November 20, 2026</p>
        <p><strong>Service provider:</strong> Metanomic, a Pennsylvania limited liability company</p>
      </header>
      <p>This Privacy Policy explains how Metanomic handles information when you visit the Assistant Studio website, create or manage an account, join a waitlist, or use an Assistant Studio chat embedded on a website. It applies to Assistant Studio and its embedded chats. Other services and websites may have their own privacy notices.</p>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Information we collect</h2>
        <dl className="space-y-3">
          {dataCategories.map(([label, detail]) => <div key={label}>
            <dt className="font-semibold">{label}</dt>
            <dd>{detail}</dd>
          </div>)}
        </dl>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. How chats and OpenAI processing work</h2>
        <p>When you send a message, Assistant Studio sends the message, recent conversation context, the assistant’s instructions, and relevant published knowledge passages to OpenAI to generate a reply. Requests use the assistant owner’s OpenAI API key. The owner’s OpenAI account settings and applicable OpenAI terms also govern that processing.</p>
        <p>When Scope Control is active, Metanomic may send the latest message, short excerpts from the recent conversation, and the assistant’s topic list through its AI gateway to OpenAI to check whether the request relates to the business. This check runs on Metanomic’s account. Assistant owners can turn it off in Studio.</p>
        <p><strong>Assistant Studio does not store conversation transcripts in its database.</strong> The open chat or Preview keeps the conversation in browser memory, and clearing the conversation or reloading the page removes it from that view. Clearing the chat does not recall information already transmitted to a provider. Studio also keeps usage counts separately from the conversation.</p>
        <p>Metanomic does not use your Studio content to train models. Assistant Studio requests OpenAI responses with application storage disabled. OpenAI handles abuse-monitoring retention separately, and its API data-sharing controls depend on the account’s settings. <a className="underline" href="https://developers.openai.com/api/docs/guides/your-data">OpenAI API data controls</a>.</p>
        <p><strong>Do not enter passwords, payment details, government identification numbers, medical records, or other sensitive or confidential information in a chat.</strong> If you operate an assistant, publish only knowledge you are willing to have quoted or summarized to your visitors. Source titles and public URLs you provide may appear alongside answers.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Embedded chats on other websites</h2>
        <p>When you use Assistant Studio on another organization’s website, that organization chooses the assistant’s configuration and knowledge. Its privacy policy governs its website and any information you provide directly to it. This policy explains Metanomic’s handling of information through the Assistant Studio embed.</p>
        <p>If you run a website using Assistant Studio, explain how the chat works in your own privacy notice, provide any notices or choices required for your use, and give visitors another way to contact you. If you follow a source link from a chat, the destination site’s privacy practices apply.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Who receives information</h2>
        <p>We share information as needed to operate Assistant Studio:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>Hosting, database, and authentication providers</strong> help us deliver the site, securely manage accounts, and store settings, documents, and usage records.</li>
          <li><strong>OpenAI</strong> processes the information described in Section 2 to generate answers or check scope.</li>
          <li><strong>Email delivery providers</strong> process recipient addresses and email contents to deliver verification, password recovery, account notices, and enabled usage alerts.</li>
          <li><strong>Authorities or other parties</strong> may receive information where law requires it or where disclosure is reasonably necessary to protect rights, investigate fraud or abuse, or respond to a security issue.</li>
        </ul>
        <p>Metanomic uses chat messages to provide and safeguard the chat service. It does not use them to target advertising.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Cookies and browser storage</h2>
        <p>Studio uses session cookies to keep account holders signed in and support password recovery. The site may also use local browser storage for preferences, such as appearance, and for onboarding state. You can clear these settings in your browser. Blocking essential session cookies may prevent you from signing in or recovering an account.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. How long we keep information</h2>
        <p>We keep account information, assistant settings, and knowledge documents while needed to provide your account and operate your assistants. You can delete individual documents and remove or replace your OpenAI key in Studio.</p>
        <p>If you delete an eligible Studio account, its associated Studio records are removed from the active database, subject to limited records we retain to document agreements, meet legal obligations, resolve disputes, or protect the service. Backup copies, operational records, and information retained by service providers may persist after deletion. We retain waitlist information as needed to manage the requested notification or respond to an opt-out.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">7. Your choices and privacy requests</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>Manage your data in Studio.</strong> Update your account details, delete documents, remove your key, unpublish an assistant, or delete an eligible account. Removing the script from your website fully removes the integration from that site.</li>
          <li><strong>Clear a chat.</strong> Use the chat’s clear control or reload the page to remove the current conversation from the browser view. See Section 2 for the effect on previously transmitted information.</li>
          <li><strong>Leave a waitlist.</strong> Contact Metanomic and ask us to remove your email from the waitlist.</li>
          <li><strong>Make a privacy request.</strong> Depending on applicable law, you may have rights to access, correct, or delete personal information, or to exercise other privacy rights. Use the <Link className="underline" href="/contact">Metanomic contact form</Link> and identify the request as <strong>Assistant Studio privacy</strong>. We may need to verify your identity. For information collected directly by a website that embeds Studio, contact that website’s operator.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">8. Security</h2>
        <p>We encrypt connected OpenAI API keys before storage and use authentication and access controls to restrict access to account data. No online service can guarantee complete security. If you suspect that your account or API key has been compromised, contact us promptly. You can also revoke the key directly in your OpenAI account.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">9. Children’s privacy</h2>
        <p>Studio accounts are for adults. Assistant Studio is not directed to children under 13, and customers may not use the service to target them or knowingly collect their personal information through the chat. If you believe a child under 13 provided personal information through Studio, contact us so we can investigate and take appropriate action.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">10. Changes and contact</h2>
        <p>We will post changes to this policy with a new effective date. If a change materially affects how we handle personal information, we will provide additional notice where appropriate or required by law.</p>
        <p>For privacy questions or requests, use the <Link className="underline" href="/contact">Metanomic contact form</Link>.</p>
      </section>
      <Link className={s.textButton} href="/assistant-studio">Back to Studio →</Link>
    </article>
  </main>;
}
