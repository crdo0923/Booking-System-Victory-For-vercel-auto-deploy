-- 0013_inventory_transactions.sql
-- Stock In / Out ledger, room/booking linkage, ministry consumption, and audit trail

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (
    transaction_type IN ('stock_in_restock', 'stock_out_booking', 'stock_out_ministry', 'adjustment_loss_waste')
  ),
  quantity integer NOT NULL CHECK (quantity > 0),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  recipient_or_ministry text,
  notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_transactions_item_id_idx ON public.inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS inventory_transactions_room_id_idx ON public.inventory_transactions(room_id);
CREATE INDEX IF NOT EXISTS inventory_transactions_booking_id_idx ON public.inventory_transactions(booking_id);
CREATE INDEX IF NOT EXISTS inventory_transactions_created_at_idx ON public.inventory_transactions(created_at DESC);

GRANT SELECT, INSERT ON public.inventory_transactions TO app_member;

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone with app_member can view inventory transactions" ON public.inventory_transactions
  FOR SELECT
  TO app_member
  USING (true);

CREATE POLICY "Admins record inventory transactions" ON public.inventory_transactions
  FOR INSERT
  TO app_member
  WITH CHECK ((select public.is_admin()));
