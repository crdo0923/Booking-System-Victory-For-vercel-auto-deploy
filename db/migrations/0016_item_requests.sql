-- Material / item requests attached to a room booking.
CREATE TABLE IF NOT EXISTS public.item_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  notes text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','approved','fulfilled','rejected')),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.item_request_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_request_id uuid NOT NULL REFERENCES public.item_requests(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL CHECK (to_status IN ('submitted','approved','fulfilled','rejected')),
  changed_by uuid REFERENCES public.profiles(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS item_requests_booking_idx ON public.item_requests(booking_id);
CREATE INDEX IF NOT EXISTS item_requests_status_idx ON public.item_requests(status);
CREATE INDEX IF NOT EXISTS item_request_history_request_idx ON public.item_request_history(item_request_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.item_requests TO app_member;
GRANT SELECT ON public.item_request_history TO app_member;
ALTER TABLE public.item_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_request_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view their item requests" ON public.item_requests FOR SELECT TO app_member
  USING ((select public.is_admin()) OR EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()
  ));
CREATE POLICY "Members create item requests for own bookings" ON public.item_requests FOR INSERT TO app_member
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND b.user_id = auth.uid() AND b.status = 'pending'
  ));
CREATE POLICY "Admins manage item requests" ON public.item_requests FOR UPDATE TO app_member
  USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "Members view item request history" ON public.item_request_history FOR SELECT TO app_member
  USING ((select public.is_admin()) OR EXISTS (
    SELECT 1 FROM public.item_requests r
    JOIN public.bookings b ON b.id = r.booking_id
    WHERE r.id = item_request_id AND b.user_id = auth.uid()
  ));
CREATE POLICY "Admins append item request history" ON public.item_request_history FOR INSERT TO app_member
  WITH CHECK ((select public.is_admin()));

CREATE OR REPLACE FUNCTION public.record_item_request_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.item_request_history(item_request_id, from_status, to_status, changed_by)
  VALUES (NEW.id, NULL, NEW.status, auth.uid());
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS item_request_submission_history ON public.item_requests;
CREATE TRIGGER item_request_submission_history
  AFTER INSERT ON public.item_requests FOR EACH ROW
  EXECUTE FUNCTION public.record_item_request_submission();

CREATE OR REPLACE FUNCTION public.record_item_request_status(
  p_request_id uuid, p_status text, p_note text DEFAULT NULL
) RETURNS public.item_requests LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE r public.item_requests;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO r FROM public.item_requests WHERE id = p_request_id FOR UPDATE;
  IF r.id IS NULL THEN RETURN NULL; END IF;
  IF r.status IN ('fulfilled','rejected') THEN RAISE EXCEPTION 'request is already closed'; END IF;
  IF (r.status, p_status) NOT IN (('submitted','approved'), ('submitted','rejected'), ('approved','fulfilled')) THEN
    RAISE EXCEPTION 'invalid status transition';
  END IF;
  INSERT INTO public.item_request_history(item_request_id, from_status, to_status, changed_by, note)
    VALUES (r.id, r.status, p_status, auth.uid(), p_note);
  UPDATE public.item_requests SET status = p_status, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now() WHERE id = r.id RETURNING * INTO r;
  RETURN r;
END $$;
