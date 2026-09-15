-- Prüft die Absicherung aus Migration 003 – direkt in der Datenbank.
--
-- Spielt drei Rollen durch: ein fremdes Konto (z. B. das Sapora-Familienkonto),
-- nicht angemeldet (anon) und das eigene Konto.
-- Es wird NICHTS dauerhaft verändert: Am Ende steht "rollback", und alle
-- Schreibversuche müssen ohnehin scheitern.
--
-- Ergebnis:
--   bestanden → Tabelle mit "Alle Prüfungen bestanden"
--   Problem   → Fehlermeldung, die mit "FEHLER:" beginnt

begin;

set local role authenticated;

do $$
declare
  n int;
  fremd constant text := '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}';
  eigen constant text := '{"sub":"07702ab5-48df-441b-96fa-03d67bfdd172","role":"authenticated"}';
begin
  -- a) Fremdes, angemeldetes Konto: sieht nichts ...
  perform set_config('request.jwt.claims', fremd, true);

  select count(*) into n from aspira.applications;
  if n <> 0 then raise exception 'FEHLER: fremdes Konto sieht % Stellen', n; end if;
  select count(*) into n from aspira.cv;
  if n <> 0 then raise exception 'FEHLER: fremdes Konto sieht den CV'; end if;
  select count(*) into n from aspira.agentur_termine;
  if n <> 0 then raise exception 'FEHLER: fremdes Konto sieht % Termine', n; end if;
  select count(*) into n from aspira.agentur_aufgaben;
  if n <> 0 then raise exception 'FEHLER: fremdes Konto sieht % Checklisten-Punkte', n; end if;

  -- ... und darf auch nichts für sich selbst anlegen.
  begin
    insert into aspira.agentur_aufgaben (user_id, schluessel, typ)
    values ('00000000-0000-0000-0000-000000000000', 'pruefung', 'fahrplan');
    raise exception 'FEHLER: fremdes Konto konnte in agentur_aufgaben schreiben';
  exception when insufficient_privilege then
    null; -- erwartet: "new row violates row-level security policy"
  end;

  -- b) Eigenes Konto: sieht die eigenen Daten
  perform set_config('request.jwt.claims', eigen, true);

  select count(*) into n from aspira.applications;
  if n = 0 then raise exception 'FEHLER: eigenes Konto sieht keine Stellen'; end if;
  select count(*) into n from aspira.cv;
  if n = 0 then raise exception 'FEHLER: eigenes Konto sieht keinen CV'; end if;

  -- c) Nicht angemeldet (anon): kein Zugriff auf die Tabellen
  execute 'set local role anon';
  begin
    select count(*) into n from aspira.applications;
    raise exception 'FEHLER: anon kann applications lesen';
  exception when insufficient_privilege then
    null; -- erwartet: "permission denied for table applications"
  end;
end;
$$;

rollback;

select 'Alle Prüfungen bestanden' as ergebnis;
