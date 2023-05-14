alter table "public"."forecasts" drop constraint "forecasts_flight_id_fkey";

alter table "public"."flights" drop column "airport_info_url";

alter table "public"."flights" add column "destination_airport_info_url" text;

alter table "public"."flights" add column "operator" text;

alter table "public"."flights" add column "origin_airport_info_url" text;

alter table "public"."flights" add column "weather_forecast_error" text;

alter table "public"."flights" add column "weather_forecast_fetched" boolean;

alter table "public"."flights" add column "weather_forecast_id" bigint;

alter table "public"."flights" add column "weather_forecast_status_code" integer;

alter table "public"."schedule_lookup" add column "lookup_flight_id" bigint;

alter table "public"."schedule_lookup" add column "lookup_status_code" bigint;

alter table "public"."schedule_lookup" add column "lookup_weather_complete" boolean;

alter table "public"."flights" add constraint "flights_weather_forecast_id_fkey" FOREIGN KEY (weather_forecast_id) REFERENCES forecasts(id) not valid;

alter table "public"."flights" validate constraint "flights_weather_forecast_id_fkey";

alter table "public"."schedule_lookup" add constraint "schedule_lookup_lookup_flight_id_fkey" FOREIGN KEY (lookup_flight_id) REFERENCES flights(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."schedule_lookup" validate constraint "schedule_lookup_lookup_flight_id_fkey";

alter table "public"."forecasts" add constraint "forecasts_flight_id_fkey" FOREIGN KEY (flight_id) REFERENCES flights(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."forecasts" validate constraint "forecasts_flight_id_fkey";

create policy "users can update their flights"
on "public"."flights"
as permissive
for update
to public
using ((auth.uid() = user_id));



