-- 0014_room_assets.sql
-- Room assets (fixed and movable) with asset transfer/movement tracking between rooms

CREATE TABLE IF NOT EXISTS public.room_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  name text NOT NULL,
  asset_tag text UNIQUE,
  category text NOT NULL CHECK (category IN ('av_production', 'furniture', 'instrument', 'it_hardware', 'appliance', 'fixture', 'other')),
  is_movable boolean NOT NULL DEFAULT true,
  condition text NOT NULL DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'needs_repair', 'damaged')),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  serial_number text,
  model_number text,
  notes text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS room_assets_room_id_idx ON public.room_assets(room_id);
CREATE INDEX IF NOT EXISTS room_assets_is_movable_idx ON public.room_assets(is_movable);
CREATE INDEX IF NOT EXISTS room_assets_is_archived_idx ON public.room_assets(is_archived);
CREATE INDEX IF NOT EXISTS room_assets_category_idx ON public.room_assets(category);

-- Asset movement history tracking movable assets between rooms
CREATE TABLE IF NOT EXISTS public.asset_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.room_assets(id) ON DELETE CASCADE,
  from_room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  to_room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  moved_by uuid NOT NULL REFERENCES public.profiles(id),
  reason text,
  moved_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asset_movements_asset_id_idx ON public.asset_movements(asset_id);
CREATE INDEX IF NOT EXISTS asset_movements_from_room_id_idx ON public.asset_movements(from_room_id);
CREATE INDEX IF NOT EXISTS asset_movements_to_room_id_idx ON public.asset_movements(to_room_id);
CREATE INDEX IF NOT EXISTS asset_movements_moved_at_idx ON public.asset_movements(moved_at DESC);

-- Permissions & RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_assets TO app_member;
GRANT SELECT, INSERT ON public.asset_movements TO app_member;

ALTER TABLE public.room_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone with app_member can view room assets" ON public.room_assets
  FOR SELECT
  TO app_member
  USING (true);

CREATE POLICY "Admins manage room assets" ON public.room_assets
  FOR ALL
  TO app_member
  USING ((select public.is_admin()))
  WITH CHECK ((select public.is_admin()));

CREATE POLICY "Anyone with app_member can view asset movements" ON public.asset_movements
  FOR SELECT
  TO app_member
  USING (true);

CREATE POLICY "Admins record asset movements" ON public.asset_movements
  FOR INSERT
  TO app_member
  WITH CHECK ((select public.is_admin()));
