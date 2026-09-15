-- 002 – Aspira-Tabellen von "public" nach "aspira" verschieben (Schritt 3b, #49)
--
-- Voraussetzungen:
--   1. 001 ist gelaufen.
--   2. Das Schema "aspira" ist in der Data API freigeschaltet.
--   3. Die neue Frontend-Version (db.schema = 'aspira') ist deployt.
--
-- "set schema" verschiebt jede Tabelle samt Daten, Constraints, Indexen,
-- RLS-Policies und Rechten. Es wird nichts kopiert und nichts gelöscht.
-- Alles oder nichts: Schlägt eine Zeile fehl, bleibt alles in "public".

begin;

alter table public.applications     set schema aspira;
alter table public.cv               set schema aspira;
alter table public.agentur_termine  set schema aspira;
alter table public.agentur_aufgaben set schema aspira;

commit;

-- Data API (PostgREST) sofort über die neue Struktur informieren.
notify pgrst, 'reload schema';

-- Kontrolle: Zeilen je Tabelle – muss zur Sicherung vom 2026-09-15 passen
-- (applications 7, cv 1, agentur_termine 1, agentur_aufgaben 3).
select 'applications' as tabelle, count(*) as zeilen from aspira.applications
union all select 'cv', count(*) from aspira.cv
union all select 'agentur_termine', count(*) from aspira.agentur_termine
union all select 'agentur_aufgaben', count(*) from aspira.agentur_aufgaben;

-- ---------------------------------------------------------------------------
-- Zurück (NUR im Notfall – dann auch den Frontend-Commit zurücknehmen):
-- ---------------------------------------------------------------------------
-- begin;
-- alter table aspira.applications     set schema public;
-- alter table aspira.cv               set schema public;
-- alter table aspira.agentur_termine  set schema public;
-- alter table aspira.agentur_aufgaben set schema public;
-- commit;
-- notify pgrst, 'reload schema';
