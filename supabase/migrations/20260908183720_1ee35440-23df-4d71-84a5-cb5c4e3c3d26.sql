-- ============ ENUMS ============
create type public.app_role as enum (
  'super_admin','content_admin','news_editor','event_manager','moderator','transparency_manager','academy_manager','member'
);
create type public.content_status as enum ('draft','scheduled','published','archived');
create type public.event_status as enum ('scheduled','cancelled','archived');
create type public.discussion_status as enum ('open','locked','archived');
create type public.reaction_kind as enum ('support','oppose');

-- ============ UTIL ============
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' and to_jsonb(new) ? 'version' then
    new.version = coalesce(old.version,1) + 1;
  end if;
  return new;
end;
$$;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Member',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ============ ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.can_manage(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in (_role, 'super_admin'::public.app_role)
  );
$$;

-- profile policies
create policy "own profile readable" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admins read profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(),'super_admin') or public.has_role(auth.uid(),'moderator'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));

-- ============ AUDIT LOG ============
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  created_at timestamptz not null default now()
);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "super admin reads audit" on public.audit_log for select to authenticated using (public.has_role(auth.uid(),'super_admin'));

create or replace function public.write_audit(_action text, _entity text, _entity_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log(actor_id, action, entity, entity_id)
  values (auth.uid(), left(_action,120), left(_entity,60), left(coalesce(_entity_id,''),80));
end;
$$;

create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.write_audit(lower(tg_op), tg_table_name, coalesce((case when tg_op='DELETE' then old.id else new.id end)::text,''));
  return case when tg_op='DELETE' then old else new end;
end;
$$;

-- ============ ROLE MANAGEMENT (privileged, server-checked) ============
create or replace function public.bootstrap_super_admin()
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.user_roles where role = 'super_admin') then
    return false;
  end if;
  insert into public.user_roles(user_id, role, granted_by) values (uid,'super_admin',uid)
  on conflict do nothing;
  perform public.write_audit('bootstrap_super_admin','user_roles',uid::text);
  return true;
end;
$$;

create or replace function public.grant_role(_user_id uuid, _role public.app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'super_admin') then raise exception 'not authorized'; end if;
  if _user_id = auth.uid() then raise exception 'cannot change your own roles'; end if;
  insert into public.user_roles(user_id, role, granted_by) values (_user_id,_role,auth.uid())
  on conflict (user_id, role) do nothing;
  perform public.write_audit('grant_role:'||_role::text,'user_roles',_user_id::text);
end;
$$;

create or replace function public.revoke_role(_user_id uuid, _role public.app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'super_admin') then raise exception 'not authorized'; end if;
  if _user_id = auth.uid() then raise exception 'cannot change your own roles'; end if;
  delete from public.user_roles where user_id=_user_id and role=_role;
  perform public.write_audit('revoke_role:'||_role::text,'user_roles',_user_id::text);
end;
$$;

create or replace function public.list_members()
returns table (user_id uuid, display_name text, joined_at timestamptz, roles text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.created_at,
    coalesce(array_agg(r.role::text) filter (where r.role is not null), '{}')
  from public.profiles p
  left join public.user_roles r on r.user_id = p.id
  where public.has_role(auth.uid(),'super_admin')
  group by p.id, p.display_name, p.created_at
  order by p.created_at desc
  limit 200;
$$;

-- ============ NEW USER TRIGGER ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''), split_part(new.email,'@',1),'Member'),60))
  on conflict (id) do nothing;
  insert into public.user_roles(user_id, role) values (new.id,'member') on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ NEWS ============
create table public.news_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 200),
  summary text check (char_length(summary) <= 500),
  body text not null check (char_length(body) between 10 and 40000),
  cover_url text,
  category text not null default 'General' check (char_length(category) <= 60),
  source text not null default 'Official Media Office' check (char_length(source) <= 120),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  version integer not null default 1,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index news_pub_idx on public.news_articles (status, published_at desc);
grant select, insert, update, delete on public.news_articles to authenticated;
grant select on public.news_articles to anon;
grant all on public.news_articles to service_role;
alter table public.news_articles enable row level security;
create policy "public reads published news" on public.news_articles for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());
create policy "editors read all news" on public.news_articles for select to authenticated
  using (public.can_manage(auth.uid(),'news_editor') or public.can_manage(auth.uid(),'content_admin'));
create policy "editors insert news" on public.news_articles for insert to authenticated
  with check (public.can_manage(auth.uid(),'news_editor') or public.can_manage(auth.uid(),'content_admin'));
create policy "editors update news" on public.news_articles for update to authenticated
  using (public.can_manage(auth.uid(),'news_editor') or public.can_manage(auth.uid(),'content_admin'))
  with check (public.can_manage(auth.uid(),'news_editor') or public.can_manage(auth.uid(),'content_admin'));
create policy "super admin deletes news" on public.news_articles for delete to authenticated
  using (public.has_role(auth.uid(),'super_admin'));
create trigger news_updated before update on public.news_articles for each row execute function public.set_updated_at();
create trigger news_audit after insert or update or delete on public.news_articles for each row execute function public.audit_trigger();

-- ============ EVENTS ============
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 200),
  description text not null default '' check (char_length(description) <= 8000),
  image_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Asia/Baghdad',
  location text not null default 'To be announced' check (char_length(location) <= 200),
  category text not null default 'Public event',
  status public.event_status not null default 'scheduled',
  version integer not null default 1,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index events_unique_slot on public.events (lower(title), starts_at);
create index events_time_idx on public.events (starts_at);
grant select, insert, update, delete on public.events to authenticated;
grant select on public.events to anon;
grant all on public.events to service_role;
alter table public.events enable row level security;
create policy "public reads events" on public.events for select to anon, authenticated using (status <> 'archived');
create policy "managers read all events" on public.events for select to authenticated
  using (public.can_manage(auth.uid(),'event_manager') or public.can_manage(auth.uid(),'content_admin'));
create policy "managers write events" on public.events for insert to authenticated
  with check (public.can_manage(auth.uid(),'event_manager') or public.can_manage(auth.uid(),'content_admin'));
create policy "managers update events" on public.events for update to authenticated
  using (public.can_manage(auth.uid(),'event_manager') or public.can_manage(auth.uid(),'content_admin'))
  with check (public.can_manage(auth.uid(),'event_manager') or public.can_manage(auth.uid(),'content_admin'));
create policy "super admin deletes events" on public.events for delete to authenticated
  using (public.has_role(auth.uid(),'super_admin'));
create trigger events_updated before update on public.events for each row execute function public.set_updated_at();
create trigger events_audit after insert or update or delete on public.events for each row execute function public.audit_trigger();

create or replace function public.validate_event()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.ends_at is not null and new.ends_at <= new.starts_at then
    raise exception 'Event end time must be after the start time';
  end if;
  return new;
end;
$$;
create trigger events_validate before insert or update on public.events for each row execute function public.validate_event();

-- ============ DISCUSSIONS ============
create table public.discussions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 5 and 200),
  body text not null check (char_length(body) between 10 and 10000),
  category text not null default 'Ideas',
  status public.discussion_status not null default 'open',
  author_id uuid not null references auth.users(id) on delete cascade,
  client_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index discussions_idem on public.discussions (author_id, client_token) where client_token is not null;
grant select, insert, update on public.discussions to authenticated;
grant select on public.discussions to anon;
grant all on public.discussions to service_role;
alter table public.discussions enable row level security;
create policy "public reads discussions" on public.discussions for select to anon, authenticated using (status <> 'archived');
create policy "moderators read all discussions" on public.discussions for select to authenticated using (public.can_manage(auth.uid(),'moderator'));
create policy "members create discussions" on public.discussions for insert to authenticated with check (author_id = auth.uid());
create policy "moderators update discussions" on public.discussions for update to authenticated
  using (public.can_manage(auth.uid(),'moderator')) with check (public.can_manage(auth.uid(),'moderator'));
create trigger discussions_updated before update on public.discussions for each row execute function public.set_updated_at();

create table public.discussion_reactions (
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction public.reaction_kind not null,
  created_at timestamptz not null default now(),
  primary key (discussion_id, user_id)
);
grant select, insert, update, delete on public.discussion_reactions to authenticated;
grant select on public.discussion_reactions to anon;
grant all on public.discussion_reactions to service_role;
alter table public.discussion_reactions enable row level security;
create policy "reactions readable" on public.discussion_reactions for select to anon, authenticated using (true);
create policy "own reaction write" on public.discussion_reactions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.discussion_comments (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 2 and 4000),
  is_removed boolean not null default false,
  client_token text,
  created_at timestamptz not null default now()
);
create unique index comments_idem on public.discussion_comments (user_id, client_token) where client_token is not null;
create index comments_discussion_idx on public.discussion_comments (discussion_id, created_at);
grant select, insert, update on public.discussion_comments to authenticated;
grant select on public.discussion_comments to anon;
grant all on public.discussion_comments to service_role;
alter table public.discussion_comments enable row level security;
create policy "comments readable" on public.discussion_comments for select to anon, authenticated using (is_removed = false);
create policy "moderators read all comments" on public.discussion_comments for select to authenticated using (public.can_manage(auth.uid(),'moderator'));
create policy "members comment" on public.discussion_comments for insert to authenticated with check (user_id = auth.uid());
create policy "moderators moderate comments" on public.discussion_comments for update to authenticated
  using (public.can_manage(auth.uid(),'moderator')) with check (public.can_manage(auth.uid(),'moderator'));

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('discussion','comment')),
  target_id uuid not null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);
grant select, insert, update on public.content_reports to authenticated;
grant all on public.content_reports to service_role;
alter table public.content_reports enable row level security;
create policy "moderators read reports" on public.content_reports for select to authenticated using (public.can_manage(auth.uid(),'moderator'));
create policy "members report" on public.content_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "moderators resolve reports" on public.content_reports for update to authenticated
  using (public.can_manage(auth.uid(),'moderator')) with check (public.can_manage(auth.uid(),'moderator'));

-- atomic, idempotent discussion actions
create or replace function public.react_to_discussion(_discussion_id uuid, _reaction public.reaction_kind)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.discussions where id=_discussion_id and status='open') then
    raise exception 'This discussion is not open';
  end if;
  insert into public.discussion_reactions(discussion_id,user_id,reaction)
  values (_discussion_id, auth.uid(), _reaction)
  on conflict (discussion_id,user_id) do update set reaction = excluded.reaction, created_at = now();
end;
$$;

create or replace function public.discussion_stats(_discussion_id uuid)
returns table (supports bigint, opposes bigint, comments bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.discussion_reactions where discussion_id=_discussion_id and reaction='support'),
    (select count(*) from public.discussion_reactions where discussion_id=_discussion_id and reaction='oppose'),
    (select count(*) from public.discussion_comments where discussion_id=_discussion_id and is_removed=false);
$$;

-- ============ POLLS ============
create table public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 5 and 300),
  description text not null default '' check (char_length(description) <= 2000),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status public.content_status not null default 'draft',
  results_public boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.polls to authenticated;
grant select on public.polls to anon;
grant all on public.polls to service_role;
alter table public.polls enable row level security;
create policy "public reads polls" on public.polls for select to anon, authenticated using (status = 'published');
create policy "admins read polls" on public.polls for select to authenticated using (public.can_manage(auth.uid(),'content_admin'));
create policy "admins insert polls" on public.polls for insert to authenticated with check (public.can_manage(auth.uid(),'content_admin'));
create policy "admins update polls" on public.polls for update to authenticated
  using (public.can_manage(auth.uid(),'content_admin')) with check (public.can_manage(auth.uid(),'content_admin'));
create trigger polls_updated before update on public.polls for each row execute function public.set_updated_at();

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 160),
  position integer not null default 0
);
grant select, insert, update, delete on public.poll_options to authenticated;
grant select on public.poll_options to anon;
grant all on public.poll_options to service_role;
alter table public.poll_options enable row level security;
create policy "public reads options" on public.poll_options for select to anon, authenticated using (true);
create policy "admins manage options" on public.poll_options for all to authenticated
  using (public.can_manage(auth.uid(),'content_admin')) with check (public.can_manage(auth.uid(),'content_admin'));

create table public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);
grant select on public.poll_votes to authenticated;
grant all on public.poll_votes to service_role;
alter table public.poll_votes enable row level security;
create policy "own vote readable" on public.poll_votes for select to authenticated using (user_id = auth.uid());

create or replace function public.cast_vote(_poll_id uuid, _option_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p record;
begin
  if uid is null then raise exception 'You must be signed in to vote'; end if;
  select * into p from public.polls where id=_poll_id and status='published' for share;
  if p is null then raise exception 'This poll is not available'; end if;
  if now() < p.starts_at then raise exception 'This poll has not opened yet'; end if;
  if now() > p.ends_at then raise exception 'This poll has closed'; end if;
  if not exists (select 1 from public.poll_options where id=_option_id and poll_id=_poll_id) then
    raise exception 'Invalid option';
  end if;
  insert into public.poll_votes(poll_id,user_id,option_id) values (_poll_id,uid,_option_id)
  on conflict (poll_id,user_id) do nothing;
  if not found then return 'already_voted'; end if;
  return 'recorded';
end;
$$;

create or replace function public.poll_results(_poll_id uuid)
returns table (option_id uuid, label text, votes bigint)
language plpgsql stable security definer set search_path = public as $$
declare p record;
begin
  select * into p from public.polls where id=_poll_id and status='published';
  if p is null then return; end if;
  if not p.results_public and now() <= p.ends_at then return; end if;
  return query
    select o.id, o.label, count(v.user_id)
    from public.poll_options o
    left join public.poll_votes v on v.option_id = o.id
    where o.poll_id = _poll_id
    group by o.id, o.label
    order by o.position;
end;
$$;

-- ============ TRANSPARENCY ============
create table public.transparency_records (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 200),
  category text not null default 'Disclosure',
  summary text not null default '' check (char_length(summary) <= 4000),
  document_url text,
  source text not null default 'Office of Integrity',
  indicator_label text,
  indicator_value numeric,
  indicator_target numeric,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.transparency_records to authenticated;
grant select on public.transparency_records to anon;
grant all on public.transparency_records to service_role;
alter table public.transparency_records enable row level security;
create policy "public reads transparency" on public.transparency_records for select to anon, authenticated
  using (status='published' and published_at is not null and published_at <= now());
create policy "managers read transparency" on public.transparency_records for select to authenticated
  using (public.can_manage(auth.uid(),'transparency_manager'));
create policy "managers insert transparency" on public.transparency_records for insert to authenticated
  with check (public.can_manage(auth.uid(),'transparency_manager'));
create policy "managers update transparency" on public.transparency_records for update to authenticated
  using (public.can_manage(auth.uid(),'transparency_manager')) with check (public.can_manage(auth.uid(),'transparency_manager'));
create trigger transparency_updated before update on public.transparency_records for each row execute function public.set_updated_at();
create trigger transparency_audit after insert or update on public.transparency_records for each row execute function public.audit_trigger();

-- ============ ACADEMY ============
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 200),
  description text not null default '' check (char_length(description) <= 4000),
  cover_url text,
  level text not null default 'Foundation',
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.courses to authenticated;
grant select on public.courses to anon;
grant all on public.courses to service_role;
alter table public.courses enable row level security;
create policy "public reads courses" on public.courses for select to anon, authenticated using (status='published');
create policy "academy reads courses" on public.courses for select to authenticated using (public.can_manage(auth.uid(),'academy_manager'));
create policy "academy insert courses" on public.courses for insert to authenticated with check (public.can_manage(auth.uid(),'academy_manager'));
create policy "academy update courses" on public.courses for update to authenticated
  using (public.can_manage(auth.uid(),'academy_manager')) with check (public.can_manage(auth.uid(),'academy_manager'));
create trigger courses_updated before update on public.courses for each row execute function public.set_updated_at();

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 200),
  content text not null default '' check (char_length(content) <= 40000),
  position integer not null default 0,
  duration_minutes integer not null default 10 check (duration_minutes between 1 and 600)
);
grant select, insert, update, delete on public.lessons to authenticated;
grant select on public.lessons to anon;
grant all on public.lessons to service_role;
alter table public.lessons enable row level security;
create policy "public reads lessons" on public.lessons for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and c.status='published'));
create policy "academy manages lessons" on public.lessons for all to authenticated
  using (public.can_manage(auth.uid(),'academy_manager')) with check (public.can_manage(auth.uid(),'academy_manager'));

create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
grant select, insert, delete on public.lesson_progress to authenticated;
grant all on public.lesson_progress to service_role;
alter table public.lesson_progress enable row level security;
create policy "own progress" on public.lesson_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ SEED CONTENT ============
insert into public.news_articles (title, summary, body, category, source, status, published_at) values
('تجمع الفاو زاخو launches its official digital platform',
 'A single trusted channel for announcements, events, consultations and transparency reports.',
 'Today the party opens its official digital platform to every citizen, member and supporter. The platform brings together verified announcements, public events, open consultations and the full transparency archive in one place.

Every item published here passes through an authorised editorial process, is dated, and carries its official source. Our commitment is simple: no rumour, no anonymous claims, and no unverified numbers.',
 'Announcement','Office of the Secretary General','published', now() - interval '2 hours'),
('National service delivery plan enters its second phase',
 'The second phase focuses on water networks, school rehabilitation and local employment.',
 'The party''s service delivery committee confirmed that the second phase of the national plan has formally begun. Priorities for this phase are water network repair in rural districts, rehabilitation of twenty-four schools, and local employment programmes for graduates.

Progress indicators for each commitment are published in the transparency section and updated monthly.',
 'Policy','Policy Committee','published', now() - interval '1 day'),
('Statement on regional cooperation and civic dialogue',
 'The party reaffirms its commitment to peaceful dialogue and institutional cooperation.',
 'In a statement issued this morning, the party reaffirmed its position that regional stability is built through institutions, lawful process and continuous civic dialogue. The statement calls on all parties to protect public services from political disruption.',
 'Statement','Official Media Office','published', now() - interval '3 days'),
('Youth council opens applications for the new session',
 'Members aged 18 to 30 can now apply to join the youth council session.',
 'Applications are open for the new session of the youth council. Selected members take part in policy research, community initiatives and the party''s public consultation programme.

Applications are reviewed by the membership committee, and results are announced through this platform.',
 'Youth','Membership Committee','published', now() - interval '5 days');

insert into public.events (title, description, starts_at, ends_at, location, category) values
('General Assembly — Annual Session','The annual general assembly reviews the yearly report, financial disclosure and the coming year''s priorities. Open to registered members.', now() + interval '6 days', now() + interval '6 days 4 hours','Central Hall, Zakho','Conference'),
('Public Meeting: Local Services in Al-Faw','An open meeting with residents to discuss water, electricity and road maintenance priorities.', now() + interval '12 days', now() + interval '12 days 3 hours','Community Centre, Al-Faw','Public event'),
('Youth Leadership Workshop','A practical workshop on public speaking, civic organising and campaign ethics for members under 30.', now() + interval '20 days', now() + interval '20 days 6 hours','Party Training Centre','Youth activity'),
('Community Volunteering Day','A joint volunteering day for neighbourhood cleaning and support for families in need.', now() + interval '30 days', now() + interval '30 days 5 hours','Multiple districts','Community activity');

insert into public.transparency_records (title, category, summary, source, indicator_label, indicator_value, indicator_target, status, published_at) values
('Annual funding disclosure','Funding','Full disclosure of membership contributions, declared donations and public support received during the last financial year, audited by an independent office.','Office of Integrity','Disclosure completeness (%)',100,100,'published', now() - interval '10 days'),
('Commitment tracker: public services','Commitments','Progress against the fourteen public service commitments made in the last electoral programme.','Policy Committee','Commitments delivered',9,14,'published', now() - interval '7 days'),
('Decision record: internal election rules','Decisions','The full text of the internal decision updating candidacy and voting rules for internal elections, including the effective date.','Executive Council','Records published this year',18,24,'published', now() - interval '4 days'),
('Quarterly expenditure report','Financial','A breakdown of expenditure by category: operations, community programmes, training and communication.','Finance Office','Reporting timeliness (%)',96,100,'published', now() - interval '1 day');

insert into public.polls (question, description, ends_at, status, results_public) values
('Which priority should lead the next community programme?','Your answer helps the policy committee rank the next six months of community work.', now() + interval '14 days','published', true),
('How should the party expand youth participation?','An open consultation for members and supporters under 35.', now() + interval '21 days','published', true);

insert into public.poll_options (poll_id, label, position)
select id, x.label, x.pos from public.polls p,
 (values ('Water and sanitation networks',1),('School rehabilitation',2),('Local employment programmes',3),('Public health services',4)) as x(label,pos)
where p.question like 'Which priority%';

insert into public.poll_options (poll_id, label, position)
select id, x.label, x.pos from public.polls p,
 (values ('Reserved youth seats in committees',1),('Expanded training and academy places',2),('Funded youth-led local projects',3)) as x(label,pos)
where p.question like 'How should the party%';

insert into public.courses (title, description, level, status) values
('Foundations of Political Leadership','An introduction to civic responsibility, ethical leadership and the structure of democratic institutions.','Foundation','published'),
('Public Communication and Media Ethics','How to speak clearly, respectfully and accurately in public, and how to handle misinformation.','Intermediate','published'),
('Policy Research for Community Problems','A practical method for defining a local problem, gathering evidence and proposing realistic policy.','Advanced','published');

insert into public.lessons (course_id, title, content, position, duration_minutes)
select c.id, x.title, x.content, x.pos, x.mins from public.courses c,
 (values
  ('Why leadership is a duty, not a privilege','Leadership in public life begins with accountability. This lesson covers the difference between authority and responsibility, and why every mandate is temporary and conditional on trust.',1,15),
  ('Institutions and the rule of law','A clear overview of how institutions distribute power, why procedure protects citizens, and how leaders strengthen or weaken institutions.',2,20),
  ('Ethics in decision making','A practical framework for facing conflicts of interest, pressure and incomplete information.',3,18)
 ) as x(title,content,pos,mins)
where c.title = 'Foundations of Political Leadership';

insert into public.lessons (course_id, title, content, position, duration_minutes)
select c.id, x.title, x.content, x.pos, x.mins from public.courses c,
 (values
  ('Speaking clearly under pressure','Structure, tone and honesty. How to answer difficult questions without evasion.',1,15),
  ('Handling misinformation responsibly','Verification before response, and why correcting the record calmly is stronger than reacting.',2,20)
 ) as x(title,content,pos,mins)
where c.title = 'Public Communication and Media Ethics';

insert into public.lessons (course_id, title, content, position, duration_minutes)
select c.id, x.title, x.content, x.pos, x.mins from public.courses c,
 (values
  ('Defining the problem precisely','Most failed policy begins with a vague problem statement. This lesson teaches problem framing with evidence.',1,20),
  ('Gathering and testing evidence','Sources, sampling, and how to avoid confirmation bias in community research.',2,25),
  ('Writing a realistic proposal','Cost, ownership, timeline and measurement — the four parts every proposal needs.',3,25)
 ) as x(title,content,pos,mins)
where c.title = 'Policy Research for Community Problems';