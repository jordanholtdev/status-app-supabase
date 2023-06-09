create table "public"."flights" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone default now(),
    "user_id" uuid,
    "ident" text,
    "fa_flight_id" text,
    "scheduled_out" date,
    "scheduled_off" date,
    "scheduled_on" date,
    "filed_ete" bigint,
    "origin_name" text,
    "origin_city" text,
    "origin_code_iata" text,
    "destination_name" text,
    "destination_city" text,
    "destination_code_iata" text,
    "aircraft_type" text
);


alter table "public"."flights" enable row level security;

CREATE UNIQUE INDEX flights_fa_flight_id_key ON public.flights USING btree (fa_flight_id);

CREATE UNIQUE INDEX flights_pkey ON public.flights USING btree (id);

alter table "public"."flights" add constraint "flights_pkey" PRIMARY KEY using index "flights_pkey";

alter table "public"."flights" add constraint "flights_fa_flight_id_key" UNIQUE using index "flights_fa_flight_id_key";

alter table "public"."flights" add constraint "flights_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."flights" validate constraint "flights_user_id_fkey";

create policy "Users can delete their own flight"
on "public"."flights"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert flight"
on "public"."flights"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "users can select their flights"
on "public"."flights"
as permissive
for select
to public
using ((auth.uid() = user_id));



