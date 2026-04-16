-- RLS policies for admin access to widget_leads and widget_escalations
-- (service_role policies already exist from Phase 6A)

create policy "Authenticated read" on widget_leads for select to authenticated using (true);
create policy "Authenticated update" on widget_leads for update to authenticated using (true);

create policy "Authenticated read" on widget_escalations for select to authenticated using (true);
