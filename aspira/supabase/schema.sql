-- Aspira – Datenbank-Schema (Supabase / Postgres)
--
-- Ursprung: rekonstruiert am 2026-09-15 aus dem Schema-Export (sicherung/schema-export.sql).
-- Bis dahin existierte das Schema nur im Supabase-Dashboard (Tabellen in "public").
-- Änderungen seitdem: siehe migrationen/ – diese Datei zeigt den Stand NACH allen Migrationen.
-- Sie DOKUMENTIERT den Ist-Zustand und wird nicht automatisch ausgeführt.
--
-- Das Supabase-Projekt wird mit Sapora geteilt: Aspira liegt im Schema "aspira",
-- "public" gehört Sapora.
--
-- Es gibt keine Trigger und keine eigenen Funktionen.

create schema aspira;
grant usage on schema aspira to anon, authenticated, service_role; -- 001

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

-- Stellen / Bewerbungen
create table aspira.applications (
  id               uuid        not null default gen_random_uuid(),
  user_id          uuid        not null,
  company_name     text        not null,
  position         text        not null,
  status           text        not null default 'beworben',
  application_date date                 default current_date,
  job_url          text,
  notes            text,
  next_deadline    date,
  created_at       timestamptz          default now(),
  updated_at       timestamptz          default now(),
  -- (Spalten-Position 12 fehlt: gelöschte Spalte, vermutlich das Prioritäts-Feld aus #46)
  source           text,
  contact_person   text,
  job_description  text,
  last_analysis    text,
  analyzed_at      timestamptz,
  gaps             text,
  interview_chance integer,
  cover_letter     text,
  constraint applications_pkey primary key (id),
  constraint applications_user_id_fkey foreign key (user_id) references auth.users (id),
  constraint applications_status_check check (status = any (array[
    'interessant', 'Telefonat nach Recruiter-Anfrage', 'in vorbereitung', 'beworben',
    'interview', 'warte auf Rückmeldung', 'zusage', 'absage', 'zurückgezogen'
  ]))
);

-- Lebenslauf-Text (genau einer pro Person)
create table aspira.cv (
  user_id    uuid        not null,
  cv_name    text,
  cv_text    text        not null,
  updated_at timestamptz not null default now(),
  constraint cv_pkey primary key (user_id),
  constraint cv_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- Termine bei der Agentur für Arbeit
create table aspira.agentur_termine (
  id         uuid        not null default gen_random_uuid(),
  user_id    uuid        not null,
  titel      text        not null,
  datum      timestamptz not null,
  ort        text,
  notiz      text,
  created_at timestamptz not null default now(),
  constraint agentur_termine_pkey primary key (id),
  constraint agentur_termine_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- Zustand der fest im Frontend definierten Checklisten-Punkte
create table aspira.agentur_aufgaben (
  user_id    uuid        not null,
  schluessel text        not null,
  typ        text        not null, -- 'fahrplan' | 'unterlagen' | 'angebote' (nicht per Constraint geprüft)
  erledigt   boolean     not null default false,
  datum      date,
  notiz      text,
  updated_at timestamptz not null default now(),
  constraint agentur_aufgaben_pkey primary key (user_id, schluessel),
  constraint agentur_aufgaben_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- Indexe: nur die der Primärschlüssel (automatisch angelegt).

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table aspira.applications     enable row level security;
alter table aspira.cv               enable row level security;
alter table aspira.agentur_termine  enable row level security;
alter table aspira.agentur_aufgaben enable row level security;

create policy "Users can manage own applications" on aspira.applications
  for all to public
  using (auth.uid() = user_id);

create policy "Users can manage own cv" on aspira.cv
  for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own agentur_termine" on aspira.agentur_termine
  for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own agentur_aufgaben" on aspira.agentur_aufgaben
  for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Rechte (nur Rollen anon / authenticated)
-- ---------------------------------------------------------------------------

grant select, insert, update, delete, references, trigger, truncate
  on aspira.applications, aspira.cv, aspira.agentur_termine, aspira.agentur_aufgaben
  to authenticated;

-- anon hat KEINE Lese- oder Schreibrechte.
grant references, trigger, truncate
  on aspira.applications, aspira.cv, aspira.agentur_termine, aspira.agentur_aufgaben
  to anon;

-- ---------------------------------------------------------------------------
-- Auffälligkeiten (Stand Export) – werden im Umzug/Absicherung (#49) bereinigt
-- ---------------------------------------------------------------------------
-- 1. Die Policies gelten "to public" (also auch für anon). Geschützt ist anon nur, weil
--    ihm select/insert/update/delete fehlen. Sauberer: "to authenticated".
-- 2. anon und authenticated haben truncate/trigger/references. Über die Data API ist das
--    nicht nutzbar, gehört aber trotzdem entzogen (truncate umgeht RLS).
-- 3. Die Policy auf applications hat kein "with check". Postgres nutzt dann "using" auch
--    für Schreibvorgänge – funktional gleich, aber uneinheitlich zu den anderen Tabellen.
-- 4. applications.user_id hat als einzige Tabelle kein "on delete cascade".
-- 5. updated_at hat nur einen Default, keinen Trigger: Bei Änderungen bleibt der Wert stehen,
--    sofern das Frontend ihn nicht selbst setzt (applications.update tut das nicht).
