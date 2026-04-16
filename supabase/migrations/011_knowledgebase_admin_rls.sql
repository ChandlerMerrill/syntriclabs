-- Allow authenticated users to manage knowledgebase articles
create policy "Authenticated read" on knowledgebase_articles for select to authenticated using (true);
create policy "Authenticated insert" on knowledgebase_articles for insert to authenticated with check (true);
create policy "Authenticated update" on knowledgebase_articles for update to authenticated using (true);
create policy "Authenticated delete" on knowledgebase_articles for delete to authenticated using (true);
