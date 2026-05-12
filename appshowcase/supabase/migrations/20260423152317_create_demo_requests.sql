-- Migration: Create demo_requests table for Book a Demo form
CREATE TABLE IF NOT EXISTS public.demo_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    school TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON public.demo_requests(created_at);

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public) to insert a demo request (lead capture form)
DROP POLICY IF EXISTS "public_can_insert_demo_requests" ON public.demo_requests;
CREATE POLICY "public_can_insert_demo_requests"
ON public.demo_requests
FOR INSERT
TO public
WITH CHECK (true);

-- Only authenticated admins can read demo requests
DROP POLICY IF EXISTS "admin_can_read_demo_requests" ON public.demo_requests;
CREATE POLICY "admin_can_read_demo_requests"
ON public.demo_requests
FOR SELECT
TO authenticated
USING (true);
