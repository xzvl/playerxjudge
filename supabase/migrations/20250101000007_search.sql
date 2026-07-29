-- Full text search: tournaments
create or replace function public.tournaments_search_vector_update()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.short_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.location_name, '')), 'D');
  return new;
end;
$$;

create trigger tournaments_search_vector_trigger
  before insert or update of title, short_description, description, location_name
  on public.tournaments
  for each row execute function public.tournaments_search_vector_update();

create index tournaments_search_vector_idx on public.tournaments using gin (search_vector);
create index tournaments_title_trgm_idx on public.tournaments using gin (title gin_trgm_ops);

-- Full text search: communities
create or replace function public.communities_search_vector_update()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'B');
  return new;
end;
$$;

create trigger communities_search_vector_trigger
  before insert or update of name, description
  on public.communities
  for each row execute function public.communities_search_vector_update();

create index communities_search_vector_idx on public.communities using gin (search_vector);
create index communities_name_trgm_idx on public.communities using gin (name gin_trgm_ops);
