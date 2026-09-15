-- 001 – Schema "aspira" anlegen (Schritt 3a, #49)
--
-- Legt nur das leere Schema und die Zugriffsrechte darauf an.
-- Aspira läuft danach unverändert weiter (die Tabellen liegen noch in "public").
-- Erst NACH diesem Skript das Schema in den Data-API-Einstellungen freischalten.

create schema if not exists aspira;

-- Wie bisher bei "public": Die Rollen dürfen das Schema betreten.
-- Was sie dort lesen/schreiben dürfen, regeln weiterhin die Tabellenrechte
-- (anon: nichts) und Row Level Security.
-- Hinweis: Neue Tabellen in "aspira" bekommen KEINE automatischen Rechte –
-- sie müssen in ihrer Migration ausdrücklich vergeben werden.
grant usage on schema aspira to anon, authenticated, service_role;
