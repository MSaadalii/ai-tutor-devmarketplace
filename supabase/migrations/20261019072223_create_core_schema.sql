-- NO-OP duplicate. Superseded by 0001_core_schema.sql — the ONLY migration to apply.
-- Its tables/policies were identical to (and weaker than) 0001_core_schema.sql,
-- so applying both would conflict. Safe to delete from the repo (`git rm`).
select 1;
