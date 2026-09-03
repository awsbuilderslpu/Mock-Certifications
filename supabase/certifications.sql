-- Certification catalog schema, constraints, and authorization.
alter table public.certifications
  add column if not exists type text not null default 'foundational';

alter table public.certifications
  alter column provider set not null,
  alter column name set not null,
  alter column code set not null,
  alter column active set not null,
  alter column active set default true,
  alter column type set default 'foundational';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'certifications_type_check'
      and conrelid = 'public.certifications'::regclass
  ) then
    alter table public.certifications
      add constraint certifications_type_check
      check (type in ('foundational', 'associate', 'professional', 'specialty'));
  end if;
end $$;

create unique index if not exists certifications_code_unique
  on public.certifications (code);

create unique index if not exists certifications_provider_name_unique
  on public.certifications (provider, name);

update public.certifications
set type = 'foundational', updated_at = now()
where id = '9e03c008-f287-4628-a47b-f9ab5978a611'
  and code = 'AWS-CLF-C02';

alter table public.certifications enable row level security;

drop policy if exists "Authenticated users can read active certifications" on public.certifications;
drop policy if exists "Admins can read all certifications" on public.certifications;
drop policy if exists "Admins can insert certifications" on public.certifications;
drop policy if exists "Admins can update certifications" on public.certifications;
drop policy if exists "Admins can delete certifications" on public.certifications;

create policy "Authenticated users can read active certifications"
on public.certifications for select to authenticated
using (
  active = true
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "Admins can insert certifications"
on public.certifications for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "Admins can update certifications"
on public.certifications for update to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "Admins can delete certifications"
on public.certifications for delete to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);