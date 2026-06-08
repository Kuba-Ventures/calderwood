-- Allow 'pdf' as a fee_input_method.
--
-- PM "Procedure Summary" reports (Dentrix/Eaglesoft/Open Dental production
-- exports) are uploaded as PDFs and extracted with Claude's native PDF vision
-- (lib/parser/pdf-summary.ts) into code + fee + annual volume. 0003's check
-- constraint only allowed csv/xlsx/paste/manual/eob, so widen it.

-- Drop whatever check constraint currently guards fee_input_method (0003 added
-- it inline, so the name was auto-generated). Match by definition to be safe.
do $$
declare
  c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'practices'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%fee_input_method%';
  if c is not null then
    execute format('alter table practices drop constraint %I', c);
  end if;
end $$;

alter table practices
  add constraint practices_fee_input_method_check
    check (fee_input_method in ('csv','xlsx','paste','manual','eob','pdf'));
