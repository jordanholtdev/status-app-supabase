create table "public"."forecasts" (
    "id" bigint generated by default as identity not null,
    "user_id" uuid not null,
    "created_at" timestamp with time zone default now(),
    "flight_id" bigint not null,
    "fa_flight_id" text,
    "destination_city" text,
    "forecast_city" text,
    "coord_lon" double precision,
    "coord_lat" double precision,
    "country" text,
    "scheduled_departure" timestamp with time zone,
    "weather" json,
    "sunrise" text,
    "sunset" text
);


alter table "public"."forecasts" enable row level security;

CREATE UNIQUE INDEX forecasts_pkey ON public.forecasts USING btree (id);

alter table "public"."forecasts" add constraint "forecasts_pkey" PRIMARY KEY using index "forecasts_pkey";

alter table "public"."forecasts" add constraint "forecasts_flight_id_fkey" FOREIGN KEY (flight_id) REFERENCES flights(id) not valid;

alter table "public"."forecasts" validate constraint "forecasts_flight_id_fkey";

alter table "public"."forecasts" add constraint "forecasts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."forecasts" validate constraint "forecasts_user_id_fkey";

create policy "Enable insert for authenticated users only"
on "public"."forecasts"
as permissive
for insert
to service_role
with check (true);


create policy "users can insert forecasts"
on "public"."forecasts"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "users can select their forecasts"
on "public"."forecasts"
as permissive
for select
to public
using ((auth.uid() = user_id));


