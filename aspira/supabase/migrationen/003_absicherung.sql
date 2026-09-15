-- 003 – Absicherung: nur das eigene Konto, schlanke Rechte, updated_at (Schritt 4a, #49)
--
-- Hintergrund: Die Nutzerliste des Supabase-Projekts wird mit Sapora geteilt.
-- Ein gültiger Login allein reicht deshalb nicht mehr – Aspira-Daten gehören
-- ausschließlich dem Konto in aspira.ist_erlaubt().
--
-- Eine Transaktion: alles oder nichts. Bestehende Daten werden nicht verändert.
-- Danach zur Kontrolle: pruefungen/003_absicherung_pruefen.sql

begin;

-- ---------------------------------------------------------------------------
-- 1) EINE Stelle, die festlegt, wer Aspira nutzen darf
-- ---------------------------------------------------------------------------
create or replace function aspira.ist_erlaubt(uid uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  -- angemeldet UND genau dieses Konto (Aspira ist eine Ein-Personen-App)
  select (select auth.uid()) = uid
     and uid = '07702ab5-48df-441b-96fa-03d67bfdd172'::uuid;
$$;

revoke all on function aspira.ist_erlaubt(uuid) from public;
grant execute on function aspira.ist_erlaubt(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Policies ersetzen: nur "authenticated", immer using + with check
-- ---------------------------------------------------------------------------
-- Bewusst OHNE "if exists": Stimmt ein alter Name nicht, bricht das Skript ab.
-- Sonst bliebe die alte, großzügigere Policy zusätzlich aktiv (Policies werden ODER-verknüpft).
drop policy "Users can manage own applications"     on aspira.applications;
drop policy "Users can manage own cv"               on aspira.cv;
drop policy "Users can manage own agentur_termine"  on aspira.agentur_termine;
drop policy "Users can manage own agentur_aufgaben" on aspira.agentur_aufgaben;

create policy "Nur eigenes Konto" on aspira.applications
  for all to authenticated
  using (aspira.ist_erlaubt(user_id))
  with check (aspira.ist_erlaubt(user_id));

create policy "Nur eigenes Konto" on aspira.cv
  for all to authenticated
  using (aspira.ist_erlaubt(user_id))
  with check (aspira.ist_erlaubt(user_id));

create policy "Nur eigenes Konto" on aspira.agentur_termine
  for all to authenticated
  using (aspira.ist_erlaubt(user_id))
  with check (aspira.ist_erlaubt(user_id));

create policy "Nur eigenes Konto" on aspira.agentur_aufgaben
  for all to authenticated
  using (aspira.ist_erlaubt(user_id))
  with check (aspira.ist_erlaubt(user_id));

-- ---------------------------------------------------------------------------
-- 3) Rechte ausdünnen
-- ---------------------------------------------------------------------------
-- anon (nicht angemeldet) braucht auf Aspira-Tabellen gar nichts.
revoke all
  on aspira.applications, aspira.cv, aspira.agentur_termine, aspira.agentur_aufgaben
  from anon;

-- authenticated braucht nur lesen/schreiben/löschen. truncate umgeht RLS → weg.
revoke references, trigger, truncate
  on aspira.applications, aspira.cv, aspira.agentur_termine, aspira.agentur_aufgaben
  from authenticated;

-- ---------------------------------------------------------------------------
-- 4) applications wie die anderen Tabellen: Konto gelöscht → Stellen gelöscht
-- ---------------------------------------------------------------------------
alter table aspira.applications drop constraint applications_user_id_fkey;
alter table aspira.applications
  add constraint applications_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 5) updated_at bei jeder Änderung automatisch setzen
-- ---------------------------------------------------------------------------
create or replace function aspira.setze_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function aspira.setze_updated_at() from public;

create trigger applications_updated_at
  before update on aspira.applications
  for each row execute function aspira.setze_updated_at();

create trigger cv_updated_at
  before update on aspira.cv
  for each row execute function aspira.setze_updated_at();

create trigger agentur_aufgaben_updated_at
  before update on aspira.agentur_aufgaben
  for each row execute function aspira.setze_updated_at();

commit;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Kontrolle: erwartet
--   policy  – 4 Zeilen "Nur eigenes Konto → authenticated"
--   recht   – 4 Zeilen "authenticated: DELETE, INSERT, SELECT, UPDATE", KEINE Zeile für anon
--   trigger – 3 Zeilen (applications, agentur_aufgaben, cv)
-- ---------------------------------------------------------------------------
select 'policy' as art, tablename::text as tabelle,
       policyname::text || ' → ' || array_to_string(roles, ',') as details
from pg_policies
where schemaname = 'aspira'
union all
select 'recht', table_name::text,
       grantee::text || ': ' || string_agg(privilege_type::text, ', ' order by privilege_type::text)
from information_schema.role_table_grants
where table_schema = 'aspira' and grantee in ('anon', 'authenticated')
group by table_name, grantee
union all
select 'trigger', event_object_table::text, trigger_name::text
from information_schema.triggers
where trigger_schema = 'aspira'
order by art, tabelle;
