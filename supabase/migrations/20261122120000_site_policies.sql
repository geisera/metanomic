create table public.site_policies (
 kind text primary key check(kind in ('terms','privacy')), version text not null, body text not null,
 published_at timestamptz not null default now()
);
alter table public.site_policies enable row level security;
revoke all on public.site_policies from public,anon,authenticated;
grant select on public.site_policies to service_role;
insert into public.site_policies(kind,version,body) values ('privacy','site-privacy-1',$policy$Metanomic Automated Systems LLC operates metanomic.ai. This policy covers the website, contact and consultation requests, Theia, research tools, Assistant Studio, and Studio widgets embedded on customer websites.

When you browse the site, our hosting and security services process requests and technical information. When you request a consultation, we use the details you provide to respond and coordinate scheduling. When you use a research or AI tool, we process your queries and relevant context to provide results. For live AI responses, Theia sends conversation context to external model providers. For meeting bookings, Calendly receives your name, email, selected time, time zone and any summary you approve. Cloudflare Turnstile helps verify contact and booking submissions. Theia can keep chat history in session storage in your browser tab.

1. Information we collect

Account and authentication. Your email address, display name if provided, account ID, and authentication records. We use this information to create and secure your account, verify your email, help you recover access, and send account notices.

Terms acceptance. Your account ID, the version of the Terms you accepted, and the acceptance timestamp. We use this record to document your agreement.

Assistant settings and knowledge. Your assistant’s name, instructions, appearance settings, approved website addresses, uploaded or pasted documents, and any public source URLs you add. We use this information to configure and operate your assistant.

OpenAI API key. If you connect a key, we store it in encrypted form. Our server uses it to validate the connection and make model requests on your behalf. The key is not included in your embed code or visible to chat visitors.

Chat messages and replies. We process messages and recent conversation context to generate replies in Preview and the embedded chat. See Section 2 for what is sent to OpenAI and how conversations are handled.

Usage and technical information. Daily request and failure counts, usage-alert settings and delivery records, and technical information needed to load and protect the service. This can include IP addresses, website origins, and hashed rate-limit identifiers. We use this information to enforce limits, prevent abuse, troubleshoot errors, and show usage in Studio.

Visitor interaction reports. For eligible plans, Studio groups live widget messages by topic and estimated sentiment and counts clicks on the configured call to action. The assistant owner can view daily aggregates covering the last 30 days. Reporting stores counts without message text or visitor identifiers. Older counts expire through scheduled cleanup.

Support and waitlist information. If you contact us, we receive the information you choose to send. If you join a waitlist, we use your email address to manage that request and notify you about the plan you selected.

2. How chats and OpenAI processing work

When you send a message, Assistant Studio sends the message, recent conversation context, the assistant’s instructions, and relevant published knowledge passages to OpenAI to generate a reply. Requests use the assistant owner’s OpenAI API key. The owner’s OpenAI account settings and applicable OpenAI terms also govern that processing.

For Pro and Enterprise, Metanomic sends the current message, recent conversation, and matching passages from published knowledge through its AI gateway to screen for prompt injection. When topic filtering is enabled, the same check also uses the assistant’s topic list to assess relevance. The check runs on Metanomic’s account. Assistant owners can turn off topic filtering in Studio.

Assistant Studio does not store conversation transcripts in its database. The open chat or Preview keeps the conversation in browser memory, and clearing the conversation or reloading the page removes it from that view. Clearing the chat does not recall information already transmitted to a provider. Studio also keeps usage counts separately from the conversation.

Metanomic does not use your Studio content to train models. Assistant Studio requests OpenAI responses with application storage disabled. OpenAI handles abuse-monitoring retention separately, and its API data-sharing controls depend on the account’s settings. OpenAI API data controls (https://developers.openai.com/api/docs/guides/your-data).

Do not enter passwords, payment details, government identification numbers, medical records, or other sensitive or confidential information in a chat. If you operate an assistant, publish only knowledge you are willing to have quoted or summarized to your visitors. Source titles and public URLs you provide may appear alongside answers.

3. Embedded chats on other websites

When you use Assistant Studio on another organization’s website, that organization chooses the assistant’s configuration and knowledge. Its privacy policy governs its website and any information you provide directly to it. This policy explains Metanomic’s handling of information through the Assistant Studio embed.

If you run a website using Assistant Studio, explain how the chat works in your own privacy notice, provide any notices or choices required for your use, and give visitors another way to contact you. If you follow a source link from a chat, the destination site’s privacy practices apply.

4. Who receives information

We share information as needed to operate our website and services:

Hosting, database, and authentication providers help us deliver the site, securely manage accounts, and store settings, documents, and usage records.

Model providers process the information described in Section 2. OpenAI generates answers. The AI gateway routes prompt injection and topic checks to a provider that hosts the selected classifier model.

Stripe processes payments and manages subscriptions. Metanomic receives billing identifiers and subscription status to activate or pause access. Customers enter card details on Stripe’s checkout page.

Email delivery providers process recipient addresses and email contents to deliver verification, password recovery, account notices, and enabled usage alerts.

Authorities or other parties may receive information where law requires it or where disclosure is reasonably necessary to protect rights, investigate fraud or abuse, or respond to a security issue.

Metanomic uses chat messages to provide and safeguard the chat service. It does not use them to target advertising.

5. Cookies and browser storage

Studio uses session cookies to keep account holders signed in and support password recovery. The site may also use local browser storage for preferences, such as appearance, and for onboarding state. You can clear these settings in your browser. Blocking essential session cookies may prevent you from signing in or recovering an account.

6. How long we keep information

We keep account information, assistant settings, and knowledge documents while needed to provide your account and operate your assistants. You can delete individual documents and remove or replace your OpenAI key in Studio.

If you delete an eligible Studio account, its associated Studio records are removed from the active database, subject to limited records we retain to document agreements, meet legal obligations, resolve disputes, or protect the service. Backup copies, operational records, and information retained by service providers may persist after deletion. We retain waitlist information as needed to manage the requested notification or respond to an opt-out.

7. Your choices and privacy requests

Manage your data in Studio. Update your account details, delete documents, remove your key, unpublish an assistant, or delete an eligible account. Removing the script from your website fully removes the integration from that site.

Clear a chat. Use the chat’s clear control or reload the page to remove the current conversation from the browser view. See Section 2 for the effect on previously transmitted information.

Leave a waitlist. Contact Metanomic and ask us to remove your email from the waitlist.

Make a privacy request. Depending on applicable law, you may have rights to access, correct, or delete personal information, or to exercise other privacy rights. Use the Metanomic contact form (/contact) and identify the request as Metanomic privacy. We may need to verify your identity. For information collected directly by a website that embeds Studio, contact that website’s operator.

8. Security

We encrypt connected OpenAI API keys before storage and use authentication and access controls to restrict access to account data. No online service can guarantee complete security. If you suspect that your account or API key has been compromised, contact us promptly. You can also revoke the key directly in your OpenAI account.

9. Children’s privacy

Studio accounts are for adults. Assistant Studio is not directed to children under 13, and customers may not use the service to target them or knowingly collect their personal information through the chat. If you believe a child under 13 provided personal information through Studio, contact us so we can investigate and take appropriate action.

10. Changes and contact

We will post changes to this policy with a new effective date. If a change materially affects how we handle personal information, we will provide additional notice where appropriate or required by law.

For privacy questions or requests, contact Metanomic Automated Systems LLC through the Contact page (/contact).$policy$);
insert into public.site_policies(kind,version,body)
select 'terms','site-terms-1',
 'Metanomic Automated Systems LLC operates metanomic.ai. These Terms govern access to our website and hosted services, including Theia, research tools, consultation requests and Assistant Studio. Contact us through https://metanomic.ai/contact. In these Terms, “we” means Metanomic Automated Systems LLC and “you” means the individual or organization using the services. Provisions about subscriptions, connected API keys, published assistants and embeds apply when you use those features. A separate written agreement governs professional services where its provisions conflict with these Terms.' || E'\n\n' ||
 substring(body from position('1. Agreement and account eligibility' in body))
 from public.studio_terms_versions where version='starter-subscription-v1';
update public.site_policies set body=replace(replace(replace(body,'The Assistant Studio Data and Privacy notice (https://metanomic.ai/assistant-studio/privacy)', 'The Metanomic Privacy Policy (https://metanomic.ai/privacy)'), 'Metanomic contact form listed at the top of these Terms','Metanomic contact form at https://metanomic.ai/contact'), 'written agreement for Assistant Studio','written agreement for the relevant service') where kind='terms';
insert into public.studio_terms_versions(version,body) select version,body from public.site_policies where kind='terms';
create function public.publish_site_policy(p_kind text,p_version text,p_body text,p_actor uuid,p_reason text)
returns text language plpgsql security definer set search_path='' as $$
declare prior public.site_policies; next_version text;
begin
 select * into strict prior from public.site_policies where kind=p_kind for update;
 if prior.version<>p_version then return null; end if;
 next_version:='site-'||p_kind||'-'||gen_random_uuid()::text;
 if p_kind='terms' then insert into public.studio_terms_versions(version,body) values(next_version,p_body); end if;
 update public.site_policies set version=next_version,body=p_body,published_at=now() where kind=p_kind;
 insert into public.studio_staff_audit(actor_id,action,reason,before_state,after_state)
 values(p_actor,'publish_site_'||p_kind,p_reason,to_jsonb(prior),jsonb_build_object('version',next_version,'body',p_body));
 return next_version;
end $$;
revoke all on function public.publish_site_policy(text,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.publish_site_policy(text,text,text,uuid,text) to service_role;
