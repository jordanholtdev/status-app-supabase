create extension if not exists "pg_cron" with schema "extensions";


alter table "public"."flights" alter column "scheduled_off" set data type timestamp with time zone using "scheduled_off"::timestamp with time zone;

alter table "public"."flights" alter column "scheduled_on" set data type timestamp with time zone using "scheduled_on"::timestamp with time zone;

alter table "public"."flights" alter column "scheduled_out" set data type timestamp with time zone using "scheduled_out"::timestamp with time zone;


