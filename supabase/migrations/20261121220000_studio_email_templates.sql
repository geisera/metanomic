create table public.studio_email_templates (
 step text primary key, subject text not null, body text not null, label text not null,
 version integer not null default 1
);
alter table public.studio_email_templates enable row level security;
revoke all on public.studio_email_templates from public, anon, authenticated;
grant select, update on public.studio_email_templates to service_role;
insert into public.studio_email_templates(step,subject,body,label) values
('welcome', 'Welcome to Assistant Studio', 'What’s one question your customers ask every week? Add the answer to your knowledge document, then ask your assistant the same question in Preview.', 'Open Assistant Studio'),
('create', 'Create your first assistant', 'Give your assistant a name to start setting it up.', 'Create an assistant'),
('key', 'Connect your OpenAI key', 'Connect your project key so your assistant can answer questions.', 'Connect your key'),
('knowledge', 'Give your assistant its first answer', 'Add one FAQ or policy and enable it for answers.', 'Add knowledge'),
('preview', 'Try a customer question', 'Ask the question in Preview and check the answer against your document.', 'Test your assistant'),
('embed', 'Put your assistant on your site', 'Approve your website, publish the assistant, and paste the embed code on your site.', 'Publish & Embed');
create function public.studio_save_email_template(p_actor uuid,p_step text,p_subject text,p_body text,p_label text,p_version integer,p_reason text)
returns integer language plpgsql set search_path='' as $$
declare old_row public.studio_email_templates;
        new_row public.studio_email_templates;
begin
 select * into old_row from public.studio_email_templates where step=p_step for update;
 if not found or old_row.version<>p_version then return null; end if;
 update public.studio_email_templates set subject=p_subject,body=p_body,label=p_label,version=version+1
 where step=p_step returning * into new_row;
 insert into public.studio_staff_audit(actor_id,action,reason,before_state,after_state)
 values(p_actor,'save_email_template',p_reason,to_jsonb(old_row),to_jsonb(new_row));
 return new_row.version;
end $$;
revoke all on function public.studio_save_email_template(uuid,text,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.studio_save_email_template(uuid,text,text,text,text,integer,text) to service_role;
