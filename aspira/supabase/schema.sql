-- Aspira – Datenbank-Schema (Supabase / Postgres)
--
-- Ursprung: rekonstruiert am 2026-09-15 aus dem Schema-Export (sicherung/schema-export.sql).
-- Bis dahin existierte das Schema nur im Supabase-Dashboard (Tabellen in "public").
-- Änderungen seitdem: siehe migrationen/ – diese Datei zeigt den Stand NACH allen Migrationen.
-- Sie DOKUMENTIERT den Ist-Zustand und wird nicht automatisch ausgeführt.
--
-- Das Supabase-Projekt wird mit Sapora geteilt: Aspira liegt im Schema "aspira",
-- "public" gehört Sapora. Die Nutzerliste (auth.users) ist gemeinsam – deshalb
-- erlauben die Policies ausschließlich das Konto in aspira.ist_erlaubt().

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
  updated_at       timestamptz          default now(), -- per Trigger aktualisiert (003)
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
  constraint applications_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade, -- 003
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
  updated_at timestamptz not null default now(), -- per Trigger aktualisiert (003)
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
  updated_at timestamptz not null default now(), -- per Trigger aktualisiert (003)
  constraint agentur_aufgaben_pkey primary key (user_id, schluessel),
  constraint agentur_aufgaben_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- Indexe: nur die der Primärschlüssel (automatisch angelegt).

-- ---------------------------------------------------------------------------
-- Funktionen (003)
-- ---------------------------------------------------------------------------

-- Wer darf Aspira nutzen? Angemeldet UND genau dieses Konto.
create function aspira.ist_erlaubt(uid uuid)
returns boolean language sql stable set search_path = ''
as $$
  select (select auth.uid()) = uid
     and uid = '07702ab5-48df-441b-96fa-03d67bfdd172'::uuid;
$$;
revoke all on function aspira.ist_erlaubt(uuid) from public;
grant execute on function aspira.ist_erlaubt(uuid) to authenticated;

-- Setzt updated_at bei jeder Änderung.
create function aspira.setze_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function aspira.setze_updated_at() from public;

create trigger applications_updated_at before update on aspira.applications
  for each row execute function aspira.setze_updated_at();
create trigger cv_updated_at before update on aspira.cv
  for each row execute function aspira.setze_updated_at();
create trigger agentur_aufgaben_updated_at before update on aspira.agentur_aufgaben
  for each row execute function aspira.setze_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (003)
-- ---------------------------------------------------------------------------

alter table aspira.applications     enable row level security;
alter table aspira.cv               enable row level security;
alter table aspira.agentur_termine  enable row level security;
alter table aspira.agentur_aufgaben enable row level security;

create policy "Nur eigenes Konto" on aspira.applications
  for all to authenticated
  using (aspira.ist_erlaubt(user_id)) with check (aspira.ist_erlaubt(user_id));

create policy "Nur eigenes Konto" on aspira.cv
  for all to authenticated
  using (aspira.ist_erlaubt(user_id)) with check (aspira.ist_erlaubt(user_id));

create policy "Nur eigenes Konto" on aspira.agentur_termine
  for all to authenticated
  using (aspira.ist_erlaubt(user_id)) with check (aspira.ist_erlaubt(user_id));

create policy "Nur eigenes Konto" on aspira.agentur_aufgaben
  for all to authenticated
  using (aspira.ist_erlaubt(user_id)) with check (aspira.ist_erlaubt(user_id));

-- ---------------------------------------------------------------------------
-- Rechte (003)
-- ---------------------------------------------------------------------------

-- Nur lesen/schreiben/löschen – kein truncate (würde RLS umgehen).
grant select, insert, update, delete
  on aspira.applications, aspira.cv, aspira.agentur_termine, aspira.agentur_aufgaben
  to authenticated;

-- anon (nicht angemeldet) hat auf den Tabellen KEINE Rechte.
