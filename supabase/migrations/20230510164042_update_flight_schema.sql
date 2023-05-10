alter table "public"."flights" add column "actual_in" timestamp with time zone;

alter table "public"."flights" add column "actual_off" timestamp with time zone;

alter table "public"."flights" add column "actual_on" timestamp with time zone;

alter table "public"."flights" add column "airport_info_url" text;

alter table "public"."flights" add column "cancelled" boolean;

alter table "public"."flights" add column "diverted" boolean;

alter table "public"."flights" add column "estimated_off" timestamp with time zone;

alter table "public"."flights" add column "estimated_on" timestamp with time zone;

alter table "public"."flights" add column "estimated_out" timestamp with time zone;

alter table "public"."flights" add column "progress_percent" integer;

alter table "public"."flights" add column "route_distance" integer;

alter table "public"."flights" add column "status" text;


