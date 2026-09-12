-- SEEWEAR — product image storage. Public read, admin write, demo blocked.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "product images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product images uploadable by admin"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.can_manage_store());

create policy "product images updatable by admin"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.can_manage_store())
  with check (bucket_id = 'product-images' and public.can_manage_store());

create policy "product images deletable by admin"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.can_manage_store());
