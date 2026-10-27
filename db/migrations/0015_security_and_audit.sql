-- 0015_security_and_audit.sql
-- Security: Extended Roles & Permissions Matrix and System-Wide Audit Log

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  actor_email text,
  actor_role text NOT NULL,
  action text NOT NULL,
  module text NOT NULL CHECK (module IN ('rooms', 'layouts', 'displays', 'inventory', 'assets', 'bookings', 'auth_users', 'security')),
  target_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_module_idx ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_target_id_idx ON public.audit_logs(target_id);

-- 2. Permissions & RLS
GRANT SELECT, INSERT ON public.audit_logs TO app_member;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT
  TO app_member
  USING ((select public.is_admin()));

CREATE POLICY "Active members can record audit logs" ON public.audit_logs
  FOR INSERT
  TO app_member
  WITH CHECK ((select public.is_active_member()));
