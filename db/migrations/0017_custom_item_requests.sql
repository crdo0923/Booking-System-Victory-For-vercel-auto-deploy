-- Allow a member to request an item that is not in the inventory catalogue.
ALTER TABLE public.item_requests ALTER COLUMN item_id DROP NOT NULL;
ALTER TABLE public.item_requests DROP CONSTRAINT IF EXISTS item_requests_item_id_fkey;
ALTER TABLE public.item_requests
  ADD CONSTRAINT item_requests_item_or_description_check
  CHECK (item_id IS NOT NULL OR (notes IS NOT NULL AND length(btrim(notes)) BETWEEN 2 AND 200));
ALTER TABLE public.item_requests
  ADD CONSTRAINT item_requests_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);
