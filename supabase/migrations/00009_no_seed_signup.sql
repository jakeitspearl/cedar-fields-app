-- Stop seeding new owner signups with demo data. The signup trigger now just
-- creates the company + owner profile and gets out of the way. The company
-- name comes from user_metadata.company_name (collected on the /signup form),
-- with a sensible fallback if not provided.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_company_id uuid;
  user_name text;
  company_name text;
  invited_company text;
  invited_role text;
  invited_username text;
begin
  user_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    initcap(split_part(new.email, '@', 1))
  );

  invited_company := new.raw_user_meta_data->>'invited_to_company';
  invited_role := coalesce(new.raw_user_meta_data->>'invited_role', 'worker');
  invited_username := new.raw_user_meta_data->>'invited_username';

  -- Invited path: join existing company, no new company, no seed
  if invited_company is not null and invited_company <> '' then
    insert into profiles (id, company_id, role, full_name, username)
    values (new.id, invited_company::uuid, invited_role::user_role, user_name, invited_username);
    return new;
  end if;

  -- Bootstrap path: create an empty company + owner profile only.
  company_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'company_name'), ''),
    user_name || '''s Landscaping'
  );

  insert into companies (name, owner_id)
  values (company_name, new.id)
  returning id into new_company_id;

  insert into profiles (id, company_id, role, full_name)
  values (new.id, new_company_id, 'owner', user_name);

  return new;
end;
$$;
