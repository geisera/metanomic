-- Samuel: let keyword search use the full-text index.
-- With row-level security in force, Postgres will not use an index for operators that are not
-- leakproof, and the full-text match operator is not. Called by an administrator, the invoker
-- version of this function therefore scanned and decompressed every stored description and was
-- cancelled at the API statement timeout. The function now runs as its owner, which is not
-- subject to the table policies, and enforces the same administrator check itself.
-- The body is otherwise unchanged from 20261116_samuel_extract_store.sql.
create or replace function public.samuel_extract_search(p_keyword text,p_agency text,p_naics text,p_notice_type text,p_set_aside text,p_from text,p_to text,p_page integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; q tsquery; v public.samuel_extract_versions%rowtype; reason text; kind text;
begin
 if length(p_keyword)>160 or length(p_agency)>160 or p_naics !~ '^\d{0,6}$' or length(p_notice_type)>60 or length(p_set_aside)>12
  or p_from !~ '^\d{4}-\d{2}-\d{2}$' or p_to !~ '^\d{4}-\d{2}-\d{2}$' or p_page<0 or p_page>49 then raise exception 'Invalid search'; end if;
 if not exists(select 1 from public.knowledge_admins where user_id=(select auth.uid())) then raise exception 'Administrator access required' using errcode='42501'; end if;
 select * into v from public.samuel_extract_versions where is_current;
 if not found then return jsonb_build_object('ready',false); end if;
 if btrim(p_keyword)<>'' then
  -- Mirror the document normalization, keeping quotes and leading minus signs for phrase and exclusion syntax.
  q:=websearch_to_tsquery('simple'::regconfig,regexp_replace(regexp_replace(p_keyword,'([[:alnum:]])-+(?=[[:alnum:]])','\1 ','g'),'[^[:alnum:][:space:]"-]+',' ','g'));
 end if;
 kind:=lower(regexp_replace(p_notice_type,'\s+','','g'));
 with matches as (
  select n.id,n.posted,n.notice from public.samuel_extract_notices n
  where n.posted_day>=p_from and n.posted_day<=p_to
   and (q is null or n.search_document @@ q)
   and (p_agency='' or position(lower(p_agency) in n.agency)>0)
   and (p_naics='' or n.naics like p_naics || '%')
   and (p_set_aside='' or n.set_aside_code=p_set_aside)
   and (kind='' or n.notice_type=kind)
 ), page_rows as (select * from matches order by posted collate "C" desc,id collate "C" limit 20 offset p_page*20)
 select jsonb_build_object('total',(select count(*) from matches),'opportunities',coalesce((select jsonb_agg(notice order by posted collate "C" desc,id collate "C") from page_rows),'[]'::jsonb)) into result;
 reason:=case
  -- A failure counts until a later check or load succeeds.
  when exists(select 1 from public.samuel_extract_versions f where f.status='failed' and f.id>v.id and f.finished_at>coalesce(v.checked_at,v.finished_at)) then 'refresh_failed'
  when coalesce(v.checked_at,v.finished_at)<now()-interval '26 hours' then 'not_checked'
  when coalesce(v.source_last_modified,v.finished_at)<now()-interval '36 hours' then 'source_old'
 end;
 return result || jsonb_build_object('ready',true,'coverage',jsonb_build_object('sourceDate',v.source_last_modified,'loadedAt',v.finished_at,'checkedAt',v.checked_at,'indexed',v.notice_count,'descriptions',v.description_count,'stale',reason is not null,'staleReason',reason));
end $$;

revoke all on function public.samuel_extract_search(text,text,text,text,text,text,text,integer) from public,anon;
grant execute on function public.samuel_extract_search(text,text,text,text,text,text,text,integer) to authenticated;
