# OWTA: Data Model

Postgres 15+ on Supabase with PostGIS, btree_gist, and pg_trgm. Open this file when a task touches tables, RLS, views, or RPCs. Business rules (WR01 to WR12) are in `CONTEXT.md`; formulas are in `METHODOLOGY.md`.

## Conventions

- Text columns with check constraints instead of Postgres enums.
- Primary keys are `uuid default gen_random_uuid()`, except districts (`smallint` identity) and high-volume or log tables (`bigint` identity).
- All timestamps are `timestamptz`.
- RLS is enabled on every table. A table with no policy is unreadable.
- Status, dry hours, and indexes are views or functions, never columns.
- Public reads go through views that expose no personal data. Review every view that `anon` can read in Supabase's security advisor.
- SQL changes are numbered migrations in `supabase/migrations/`. Back up, apply, regenerate types, run SQL and RLS tests, then deploy.
- Seed data is fictional and labeled sample.

## Tables

| Group | Tables |
|---|---|
| Geography | districts, barangays, dma_zones, barangay_dma |
| Identity | profiles (extends auth.users) |
| Monitoring | monitoring_points, pressure_readings |
| Supply | supply_schedules, advisories |
| Methodology and index | index_methodologies, delivery_snapshots, period_notes |
| Reports | report_groups, citizen_reports |
| Relief | tankers, tanker_dispatches |
| Alerts (Phase 2) | subscriptions, notifications |
| Governance | audit_logs, rate_limit_buckets |
| Later (Phase 3, not authorized) | pipes, connection_applications, application_documents |

Relationships:
- districts 1:N barangays.
- barangays N:M dma_zones through barangay_dma (a barangay can be served by more than one DMA [A]).
- dma_zones 1:N monitoring_points 1:N pressure_readings.
- dma_zones 1:N supply_schedules.
- barangays 1:N report_groups 1:N citizen_reports.
- barangays 1:N tanker_dispatches and subscriptions.
- profiles is referenced by every created_by, published_by, and reporter_id.

## Migrations 0001 to 0003: extensions, geography, identity

```sql
create extension if not exists postgis;
create extension if not exists btree_gist;
create extension if not exists pg_trgm;

create table districts (
  id smallint generated always as identity primary key,
  name text not null unique
);

create table barangays (
  id uuid primary key default gen_random_uuid(),
  psgc_code text unique,                      -- official code if available [A]
  name text not null,
  district_id smallint not null references districts(id),
  boundary geometry(MultiPolygon, 4326),
  centroid geometry(Point, 4326),
  population integer check (population >= 0),
  households integer check (households >= 0),
  created_at timestamptz not null default now(),
  unique (district_id, name)
);
create index barangays_boundary_gix on barangays using gist (boundary);
create index barangays_name_trgm on barangays using gin (name gin_trgm_ops);

create table dma_zones (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  boundary geometry(MultiPolygon, 4326),
  notes text,
  created_at timestamptz not null default now()
);

create table barangay_dma (
  barangay_id uuid not null references barangays(id) on delete cascade,
  dma_id uuid not null references dma_zones(id) on delete cascade,
  coverage_pct numeric(5,2) check (coverage_pct between 0 and 100),
  primary key (barangay_id, dma_id)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'resident'
    check (role in ('resident','barangay_official','lgu_dispatcher',
                    'utility_operator','admin','auditor')),
  display_name text,
  organization text,
  barangay_id uuid references barangays(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  check (role <> 'barangay_official' or barangay_id is not null)
);

-- Users may change only their display name.
-- Role and verification change through an admin-only RPC.
revoke update on profiles from authenticated;
grant update (display_name) on profiles to authenticated;

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Unverified staff are treated as residents.
create function app_role() returns text
language sql stable security definer set search_path = public as $$
  select case when role = 'resident' or verified_at is not null
              then role else 'resident' end
  from profiles where id = auth.uid()
$$;

create function app_barangay() returns uuid
language sql stable security definer set search_path = public as $$
  select barangay_id from profiles
  where id = auth.uid() and verified_at is not null
$$;
```

## Migrations 0004 to 0005: monitoring, supply, methodology

```sql
create table monitoring_points (
  id uuid primary key default gen_random_uuid(),
  dma_id uuid not null references dma_zones(id),
  code text not null unique,
  name text not null,
  kind text not null check (kind in ('pressure','flow','reservoir_level')),
  location geometry(Point, 4326),
  source text not null check (source in ('manual','sensor','simulated')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table pressure_readings (
  id bigint generated always as identity primary key,
  monitoring_point_id uuid not null references monitoring_points(id),
  recorded_at timestamptz not null,
  psi numeric(6,2) not null check (psi >= 0),
  source text not null check (source in ('manual','sensor','simulated')),
  entered_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (monitoring_point_id, recorded_at)
);
create index pressure_readings_point_time_idx
  on pressure_readings (monitoring_point_id, recorded_at desc);

create table supply_schedules (
  id uuid primary key default gen_random_uuid(),
  dma_id uuid not null references dma_zones(id),
  window_start timestamptz not null,
  window_end timestamptz not null,
  flow_type text not null check (flow_type in ('full','low','shut')),
  status text not null default 'draft'
    check (status in ('draft','published','superseded','cancelled')),
  source text not null
    check (source in ('utility_advisory','operator_entry','estimated')),
  source_url text,
  advisory_notes text,
  supersedes_id uuid references supply_schedules(id),
  created_by uuid not null references profiles(id),
  published_by uuid references profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  check (window_end > window_start),
  exclude using gist (dma_id with =, tstzrange(window_start, window_end) with &&)
    where (status = 'published')              -- WR01
);

create table advisories (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('city','district','dma','barangay')),
  district_id smallint references districts(id),
  dma_id uuid references dma_zones(id),
  barangay_id uuid references barangays(id),
  severity text not null check (severity in ('info','warning','emergency')),
  title text not null check (char_length(title) <= 160),
  body text not null check (char_length(body) <= 2000),
  source_url text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check ((scope = 'city')
      or (scope = 'district' and district_id is not null)
      or (scope = 'dma' and dma_id is not null)
      or (scope = 'barangay' and barangay_id is not null))
);

create table index_methodologies (
  version integer primary key,
  min_psi numeric(5,2) not null default 5 check (min_psi >= 0),                    -- [A]
  stale_after_minutes integer not null default 360 check (stale_after_minutes > 0), -- [A]
  relief_dry_hours integer not null default 48 check (relief_dry_hours > 0),        -- [A]
  min_coverage numeric(3,2) not null default 0.70
    check (min_coverage between 0 and 1),                                           -- [A]
  description text not null,
  effective_from timestamptz not null,
  created_by uuid references profiles(id)
);

create view current_methodology as
select * from index_methodologies
where effective_from <= now()
order by effective_from desc
limit 1;

create table delivery_snapshots (
  id bigint generated always as identity primary key,
  dma_id uuid not null references dma_zones(id),
  week_start date not null,                   -- Monday, Asia/Manila
  methodology_version integer not null references index_methodologies(version),
  promised_hours numeric(6,2) not null,
  delivered_hours numeric(6,2) not null,
  coverage_ratio numeric(4,3) not null,
  insufficient_data boolean not null default false,
  computed_at timestamptz not null default now(),
  unique (dma_id, week_start, methodology_version)
);

create table period_notes (
  id uuid primary key default gen_random_uuid(),
  dma_id uuid not null references dma_zones(id),
  week_start date not null,
  author_id uuid not null references profiles(id),
  author_role text not null,
  note text not null check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);
```

Seed `index_methodologies` version 1 (default values above, `effective_from` in the past) in the same migration. Status resolves to `unknown` while no methodology row is effective.

## Migrations 0006 to 0009: reports, relief, alerts, governance

```sql
create table report_groups (
  id uuid primary key default gen_random_uuid(),
  barangay_id uuid not null references barangays(id),
  report_type text not null,
  center geometry(Point, 4326),
  report_count integer not null default 1,
  first_reported_at timestamptz not null default now(),
  last_reported_at timestamptz not null default now(),
  status text not null default 'open'
    check (status in ('open','verified','dispatched','resolved','rejected'))
);

create table citizen_reports (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique
    default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  report_type text not null
    check (report_type in ('pipe_burst','dry_tap','discolored_water','low_pressure','other')),
  barangay_id uuid not null references barangays(id),
  landmark text not null check (char_length(landmark) between 3 and 200),
  location geometry(Point, 4326),             -- staff only
  est_flow_loss_lpm numeric(8,2) check (est_flow_loss_lpm >= 0),
  description text check (char_length(description) <= 1000),
  photo_path text,                            -- Phase 2
  group_id uuid references report_groups(id),
  status text not null default 'new'
    check (status in ('new','verified','duplicate','dispatched','resolved','rejected')),
  reporter_id uuid references profiles(id),
  contact_phone text,                         -- only with consent
  consent_at timestamptz,
  triaged_by uuid references profiles(id),
  triaged_at timestamptz,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  check (contact_phone is null or consent_at is not null)
);
create index citizen_reports_barangay_idx on citizen_reports (barangay_id, created_at desc);
create index citizen_reports_group_idx on citizen_reports (group_id);
create index citizen_reports_location_gix on citizen_reports using gist (location);
create index report_groups_lookup_idx
  on report_groups (barangay_id, report_type, last_reported_at desc);

create table tankers (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  owner_org text not null check (owner_org in ('cdrrmo','utility','private','other')),
  capacity_liters integer check (capacity_liters > 0),
  active boolean not null default true
);

create table tanker_dispatches (
  id uuid primary key default gen_random_uuid(),
  tanker_id uuid references tankers(id),
  barangay_id uuid not null references barangays(id),
  status text not null default 'requested'
    check (status in ('requested','dispatched','delivered','cancelled')),  -- WR11
  requested_by uuid references profiles(id),
  dispatched_by uuid references profiles(id),
  liters_delivered integer check (liters_delivered >= 0),
  notes text,
  requested_at timestamptz not null default now(),
  dispatched_at timestamptz,
  delivered_at timestamptz
);

-- Phase 2
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  channel text not null check (channel in ('sms','viber','telegram','web_push','email')),
  address text not null,                      -- phone or chat id: personal data
  barangay_id uuid not null references barangays(id),
  topics text[] not null default '{schedule,emergency}',
  locale text not null default 'en' check (locale in ('en','fil','hil')),
  consent_at timestamptz not null,
  consent_version text not null,
  verified_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (channel, address, barangay_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  kind text not null check (kind in ('schedule_change','emergency','restored','otp')),
  payload jsonb not null,
  status text not null default 'queued'
    check (status in ('queued','sent','failed','cancelled')),
  attempts smallint not null default 0,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notifications_queue_idx on notifications (created_at) where status = 'queued';

create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_role text,
  action text not null,
  entity text not null,
  entity_id text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create function audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs (actor_id, actor_role, action, entity, entity_id,
                          before_state, after_state)
  values (auth.uid(), app_role(), tg_op, tg_table_name,
          coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id'),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

create trigger audit_schedules after insert or update or delete on supply_schedules
  for each row execute function audit_row();

create table rate_limit_buckets (
  key text primary key,
  tokens numeric not null,
  updated_at timestamptz not null default now()
);
```

Audit triggers:
- Attach `audit_row` to supply_schedules, advisories, index_methodologies, tanker_dispatches, profiles, and period_notes.
- Do not attach it to citizen_reports or subscriptions; their rows hold personal data.
- For citizen_reports use a column-filtered variant that logs only status and triage fields.

Later tables (Phase 3, not authorized for the MVP): `pipes`, `connection_applications`, `application_documents`. Financing eligibility is never a stored boolean; compute it from distance and verified program rules.

## Access control

R = read, W = write, Own = own rows, Brgy = own barangay, RPC = only through a function.

| Table or view | anon | resident | barangay | dispatcher | operator | admin | auditor |
|---|---|---|---|---|---|---|---|
| districts, barangays, dma_zones, barangay_dma | R | R | R | R | R | R+W | R |
| monitoring_points | R | R | R | R | R+W | R+W | R |
| pressure_readings | R | R | R | R | R+W | R+W | R |
| supply_schedules | R published | R published | R published | R published | R+W | R+W | R published |
| advisories | R active | R active | R + W Brgy | R+W | R+W | R+W | R |
| index_methodologies, delivery_snapshots | R | R | R | R | R | R+W | R |
| period_notes | R | R | R | R+W | R+W | R+W | R |
| citizen_reports | RPC insert | R Own | R + update Brgy | R + update | no access | R + update | no access |
| report_groups | via public view | via public view | R Brgy | R | no access | R+W | no access |
| tankers, tanker_dispatches | no access | no access | request Brgy | R+W | R | R+W | R |
| subscriptions | RPC | R Own | no access | no access | no access | no access | no access |
| notifications | no access | no access | no access | no access | no access | no access | no access |
| audit_logs | no access | no access | no access | no access | no access | R | R |
| profiles | no access | R Own | R Own | R Own | R Own | R+W via RPC | R Own |
| rate_limit_buckets | no access | no access | no access | no access | no access | no access | no access |

Nobody has direct access to subscription phone numbers. A server-side job reads them to send messages.

### Example policies

```sql
-- Public reference data. Same pattern: districts, dma_zones, barangay_dma,
-- monitoring_points, pressure_readings, index_methodologies,
-- delivery_snapshots, period_notes.
alter table barangays enable row level security;
create policy barangays_public_read on barangays for select using (true);

-- Profiles
alter table profiles enable row level security;
create policy profiles_read_own on profiles for select using (id = auth.uid());
create policy profiles_update_own on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Schedules: the public sees only published rows
alter table supply_schedules enable row level security;
create policy schedules_read on supply_schedules for select
  using (status = 'published' or app_role() in ('utility_operator','admin'));
create policy schedules_write on supply_schedules for all
  using (app_role() in ('utility_operator','admin'))
  with check (app_role() in ('utility_operator','admin'));

-- Reports: no insert policy. Inserts happen only through submit_report().
alter table citizen_reports enable row level security;
create policy reports_own on citizen_reports for select
  using (reporter_id = auth.uid());
create policy reports_brgy on citizen_reports for select
  using (app_role() = 'barangay_official' and barangay_id = app_barangay());
create policy reports_city on citizen_reports for select
  using (app_role() in ('lgu_dispatcher','admin'));
create policy reports_triage_brgy on citizen_reports for update
  using (app_role() = 'barangay_official' and barangay_id = app_barangay())
  with check (barangay_id = app_barangay());
create policy reports_triage_city on citizen_reports for update
  using (app_role() in ('lgu_dispatcher','admin')) with check (true);
revoke update on citizen_reports from authenticated;
grant update (status, triaged_by, triaged_at, resolved_at, resolution_notes)
  on citizen_reports to authenticated;

-- Public view of report groups: no personal data, no coordinates
alter table report_groups enable row level security;
create view v_public_report_groups as
select id, barangay_id, report_type, report_count,
       first_reported_at, last_reported_at, status
from report_groups
where status in ('open','verified','dispatched');
grant select on v_public_report_groups to anon, authenticated;

-- Audit log: readable by admin and auditor, writable by nobody directly
alter table audit_logs enable row level security;
revoke insert, update, delete, truncate on audit_logs from anon, authenticated;
create policy audit_read on audit_logs for select
  using (app_role() in ('admin','auditor'));

-- No policy means unreadable by default
alter table subscriptions enable row level security;
alter table notifications enable row level security;
alter table rate_limit_buckets enable row level security;
```

Write the remaining policies from the matrix. Views that `anon` can read run with their owner's rights and must expose only non-personal columns.

### RLS tests that must pass

- anon cannot read citizen_reports, subscriptions, or audit_logs.
- anon cannot insert directly into citizen_reports.
- A barangay official cannot read another barangay's reports.
- A resident cannot change their own role.
- An unverified staff account behaves as a resident.
- The public report view exposes no coordinates or contact data.

Run every role against every table and operation with one test user per role.

## Derived views

```sql
create view v_point_latest as
select distinct on (monitoring_point_id)
       monitoring_point_id, psi, recorded_at, source
from pressure_readings
order by monitoring_point_id, recorded_at desc;

create view v_dma_status as
select mp.dma_id,
       round(avg(pl.psi), 1) as avg_psi,
       max(pl.recorded_at) as as_of,
       case
         when max(pl.recorded_at) is null
           or max(pl.recorded_at) < now() - make_interval(
                mins => (select stale_after_minutes from current_methodology))
           then 'unknown'
         when avg(pl.psi) = 0 then 'dry'
         when avg(pl.psi) < (select min_psi from current_methodology) then 'low'
         else 'flowing'
       end as status
from monitoring_points mp
left join v_point_latest pl on pl.monitoring_point_id = mp.id
where mp.kind = 'pressure' and mp.active
group by mp.dma_id;

-- A barangay shows its worst status across the DMAs that serve it.
create view v_barangay_status as
select b.id as barangay_id, b.name, d.name as district,
       case
         when bool_or(s.status = 'dry') then 'dry'
         when bool_or(s.status = 'low') then 'low'
         when bool_and(s.status = 'flowing') then 'flowing'
         else 'unknown'
       end as status,
       min(s.avg_psi) as min_avg_psi,
       max(s.as_of) as as_of
from barangays b
join districts d on d.id = b.district_id
left join barangay_dma bd on bd.barangay_id = b.id
left join v_dma_status s on s.dma_id = bd.dma_id
group by b.id, b.name, d.name;

create view v_dma_dry_hours as
select mp.dma_id,
       extract(epoch from (now() - coalesce(
         max(r.recorded_at) filter (where r.psi > 0),
         min(r.recorded_at)))) / 3600.0 as dry_hours
from monitoring_points mp
join pressure_readings r on r.monitoring_point_id = mp.id
where mp.kind = 'pressure' and mp.active
group by mp.dma_id;

-- Staff only. Unknown (stale) status never triggers relief.
create view v_relief_priority as
select b.id as barangay_id, b.name, d.name as district,
       max(dh.dry_hours) as dry_hours, max(s.as_of) as as_of
from barangays b
join districts d on d.id = b.district_id
join barangay_dma bd on bd.barangay_id = b.id
join v_dma_dry_hours dh on dh.dma_id = bd.dma_id
join v_dma_status s on s.dma_id = bd.dma_id and s.status = 'dry'
where dh.dry_hours >= (select relief_dry_hours from current_methodology)
group by b.id, b.name, d.name
order by dry_hours desc;

grant select on v_barangay_status to anon, authenticated;   -- public
-- v_dma_status, v_dma_dry_hours, v_relief_priority: staff roles only,
-- through RLS-aware server queries.
```

SQL tests use fixtures for stale, dry, and multi-DMA barangay cases.

## Report submission RPC

Residents never insert into `citizen_reports` directly. They call this function through a server route that has already checked CAPTCHA and rate limits. The 6 hour and 300 m grouping values are [A] and move to configuration once tuned. Invalid types, bad lengths, and unknown barangays are rejected by table checks and foreign keys; Zod rejects them earlier in the route.

```sql
create function submit_report(
  p_type text, p_barangay uuid, p_landmark text,
  p_lng double precision default null, p_lat double precision default null,
  p_flow_loss numeric default null, p_description text default null,
  p_phone text default null, p_consent boolean default false
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_point geometry(Point, 4326);
  v_group uuid;
  v_code text;
begin
  if p_lng is not null and p_lat is not null then
    v_point := st_setsrid(st_makepoint(p_lng, p_lat), 4326);
  end if;

  select id into v_group from report_groups
  where barangay_id = p_barangay and report_type = p_type
    and status in ('open','verified','dispatched')
    and last_reported_at > now() - interval '6 hours'
    and (v_point is null or center is null
         or st_dwithin(center::geography, v_point::geography, 300))
  order by last_reported_at desc limit 1
  for update;

  if v_group is null then
    insert into report_groups (barangay_id, report_type, center)
    values (p_barangay, p_type, v_point) returning id into v_group;
  else
    update report_groups
    set report_count = report_count + 1, last_reported_at = now()
    where id = v_group;
  end if;

  insert into citizen_reports (report_type, barangay_id, landmark, location,
    est_flow_loss_lpm, description, group_id, reporter_id,
    contact_phone, consent_at)
  values (p_type, p_barangay, p_landmark, v_point, p_flow_loss, p_description,
    v_group, auth.uid(),
    case when p_consent then p_phone end,
    case when p_consent and p_phone is not null then now() end)
  returning reference_code into v_code;

  return v_code;
end $$;

revoke all on function submit_report from public;
grant execute on function submit_report to anon, authenticated;
```

## Scale notes

A dozen monitoring points reporting every 5 minutes produce about 3,500 rows per day, which is trivial for Postgres. If volume grows: store `last_nonzero_at` on each monitoring point instead of scanning readings, partition `pressure_readings` by month, and roll old data into hourly aggregates.

Phase 3 sensor ingestion: devices post readings with a per-device key (stored hashed) and an HMAC signature. The handler calls an RPC. Writes are idempotent through the unique pair `(monitoring_point_id, recorded_at)`.
