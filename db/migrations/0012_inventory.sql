-- 0012_inventory.sql
-- Consumables catalog item master with stock tracking and reorder thresholds

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('communion', 'av_tech', 'hospitality', 'paper_office', 'cleaning')),
  unit text NOT NULL CHECK (unit IN ('pieces', 'boxes', 'packs', 'rolls', 'bottles')),
  current_stock integer NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  reorder_threshold integer NOT NULL DEFAULT 5 CHECK (reorder_threshold >= 0),
  unit_cost numeric(10, 2),
  location text NOT NULL,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_items_category_idx ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS inventory_items_is_archived_idx ON public.inventory_items(is_archived);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO app_member;

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone with app_member can view active inventory items" ON public.inventory_items
  FOR SELECT
  TO app_member
  USING (true);

CREATE POLICY "Admins manage inventory items" ON public.inventory_items
  FOR ALL
  TO app_member
  USING ((select public.is_admin()))
  WITH CHECK ((select public.is_admin()));
