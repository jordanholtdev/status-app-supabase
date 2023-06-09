create table "public"."schedule_lookup" (
    "id" bigint generated by default as identity not null,
    "user_id" uuid,
    "created_at" timestamp with time zone default now(),
    "ident" text,
    "flight_date" date,
    "lookup_complete" boolean not null default false
);


alter table "public"."schedule_lookup" enable row level security;

CREATE UNIQUE INDEX schedule_lookup_id_key ON public.schedule_lookup USING btree (id);

CREATE UNIQUE INDEX schedule_lookup_pkey ON public.schedule_lookup USING btree (id);

alter table "public"."schedule_lookup" add constraint "schedule_lookup_pkey" PRIMARY KEY using index "schedule_lookup_pkey";

alter table "public"."schedule_lookup" add constraint "schedule_lookup_id_key" UNIQUE using index "schedule_lookup_id_key";

alter table "public"."schedule_lookup" add constraint "schedule_lookup_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."schedule_lookup" validate constraint "schedule_lookup_user_id_fkey";

create policy "Enable delete for users based on user_id"
on "public"."schedule_lookup"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert a schedule lookup"
on "public"."schedule_lookup"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can select own scheduled lookups"
on "public"."schedule_lookup"
as permissive
for select
to public
using ((auth.uid() = user_id));



