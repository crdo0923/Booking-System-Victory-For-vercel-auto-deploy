-- 0011_kiosk_displays.sql
-- Tablets and TV wall displays pairing tokens and metadata

CREATE TABLE IF NOT EXISTS public.kiosk_displays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  display_type text NOT NULL CHECK (display_type IN ('door_sign', 'lobby_hub')),
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kiosk_displays_token_idx ON public.kiosk_displays(token);
CREATE INDEX IF NOT EXISTS kiosk_displays_room_id_idx ON public.kiosk_displays(room_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kiosk_displays TO app_member;

ALTER TABLE public.kiosk_displays ENABLE ROW LEVEL SECURITY;

-- Allow reading active displays, and full admin management
CREATE POLICY "Anyone with app_member can view kiosk displays" ON public.kiosk_displays
  FOR SELECT
  TO app_member
  USING (true);

CREATE POLICY "Admins manage kiosk displays" ON public.kiosk_displays
  FOR ALL
  TO app_member
  USING ((select public.is_admin()))
  WITH CHECK ((select public.is_admin()));

