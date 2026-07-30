drop policy if exists "Anyone can view published stores" on public.stores;

create policy "Anyone can view published stores"
  on public.stores for select
  to public
  using (
    is_published = true
    or public.can_manage_store(id, auth.uid())
  );
