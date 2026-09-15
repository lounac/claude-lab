-- Aspira: Schema-Export aus Supabase (nur STRUKTUR, keine Daten).
-- Im Supabase-Dashboard unter "SQL Editor" ausführen.
-- Liefert Spalten, Constraints, Indexe, RLS-Status, Policies, Trigger,
-- Funktionen und Rechte der vier Aspira-Tabellen als eine Ergebnistabelle.

with tabellen as (
  select unnest(array['applications', 'cv', 'agentur_termine', 'agentur_aufgaben']) as name
)
select * from (
  -- 1) Spalten
  select 1 as nr, c.table_name::text as tabelle, 'spalte' as art, c.column_name::text as name,
         concat_ws(' ',
           c.data_type,
           case when c.is_nullable = 'NO' then 'not null' end,
           case when c.column_default is not null then 'default ' || c.column_default end
         ) as definition,
         c.ordinal_position::int as pos
  from information_schema.columns c
  where c.table_schema = 'aspira' and c.table_name in (select name from tabellen)

  union all
  -- 2) Constraints (Primärschlüssel, Fremdschlüssel, Unique, Check)
  select 2, rel.relname::text, 'constraint', con.conname::text, pg_get_constraintdef(con.oid), 0
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relnamespace = 'aspira'::regnamespace and rel.relname in (select name from tabellen)

  union all
  -- 3) Indexe
  select 3, tablename::text, 'index', indexname::text, indexdef, 0
  from pg_indexes
  where schemaname = 'aspira' and tablename in (select name from tabellen)

  union all
  -- 4) Row Level Security an/aus
  select 4, relname::text, 'rls', 'row level security',
         case when relrowsecurity then 'aktiv' else 'aus' end, 0
  from pg_class
  where relnamespace = 'aspira'::regnamespace and relname in (select name from tabellen)

  union all
  -- 5) RLS-Policies
  select 5, tablename::text, 'policy', policyname::text,
         concat_ws(' ',
           'for', cmd,
           'to', array_to_string(roles, ','),
           'using (' || qual || ')',
           'with check (' || with_check || ')'
         ), 0
  from pg_policies
  where schemaname = 'aspira' and tablename in (select name from tabellen)

  union all
  -- 6) Trigger (z. B. automatisches updated_at)
  select 6, rel.relname::text, 'trigger', t.tgname::text, pg_get_triggerdef(t.oid), 0
  from pg_trigger t
  join pg_class rel on rel.oid = t.tgrelid
  where not t.tgisinternal
    and rel.relnamespace = 'aspira'::regnamespace
    and rel.relname in (select name from tabellen)

  union all
  -- 7) Eigene Funktionen im public-Schema (z. B. für Trigger)
  select 7, '-', 'funktion', p.proname::text, pg_get_functiondef(p.oid), 0
  from pg_proc p
  where p.pronamespace = 'aspira'::regnamespace and p.prokind = 'f'

  union all
  -- 8) Rechte der Rollen anon/authenticated
  select 8, table_name::text, 'recht', grantee::text,
         string_agg(privilege_type, ', ' order by privilege_type), 0
  from information_schema.role_table_grants
  where table_schema = 'aspira'
    and table_name in (select name from tabellen)
    and grantee in ('anon', 'authenticated')
  group by table_name, grantee
) x
order by nr, tabelle, pos, name;
