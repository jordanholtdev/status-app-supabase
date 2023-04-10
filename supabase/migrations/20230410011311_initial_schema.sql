CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH STATEMENT EXECUTE FUNCTION handle_new_user();


create table "public"."profiles" (
    "id" uuid not null,
    "updated_at" timestamp with time zone default now(),
    "username" text,
    "full_name" text,
    "avatar_url" text,
    "website" text
);


alter table "public"."profiles" enable row level security;

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.           
  raw_user_meta_data->>'avatar_url');
  return new;
end;$function$
;


