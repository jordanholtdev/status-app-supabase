create policy "Enable insert for authenticated users only"
on "public"."flights"
as permissive
for insert
to service_role
with check (true);



