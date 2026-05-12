-- ============================================================
-- SchoolDesk App Showcase — Initial Schema
-- ============================================================

-- 1. TYPES
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('admin', 'user');

-- 2. CORE TABLES

-- user_profiles (intermediary for auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role public.user_role DEFAULT 'user'::public.user_role,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- feature_sections (editable showcase content)
CREATE TABLE IF NOT EXISTS public.feature_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_order INTEGER NOT NULL DEFAULT 0,
  section_key TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'HomeIcon',
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  description TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  highlight TEXT NOT NULL DEFAULT '',
  design_insight_label TEXT NOT NULL DEFAULT 'Design Decision',
  design_insight_description TEXT NOT NULL DEFAULT '',
  screen_image TEXT NOT NULL DEFAULT '',
  screen_alt TEXT NOT NULL DEFAULT '',
  accent_color TEXT NOT NULL DEFAULT '#F59E0B',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_feature_sections_order ON public.feature_sections(section_order);
CREATE INDEX IF NOT EXISTS idx_feature_sections_key ON public.feature_sections(section_key);

-- 4. FUNCTIONS (before RLS policies)

-- Auto-create user_profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Check if current user is admin (uses auth metadata to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1 FROM auth.users au
  WHERE au.id = auth.uid()
  AND (
    au.raw_user_meta_data->>'role' = 'admin'
    OR au.raw_app_meta_data->>'role' = 'admin'
  )
)
$$;

-- 5. ENABLE RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_sections ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- user_profiles: users manage their own profile
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- feature_sections: public can read
DROP POLICY IF EXISTS "public_read_feature_sections" ON public.feature_sections;
CREATE POLICY "public_read_feature_sections"
ON public.feature_sections
FOR SELECT
TO public
USING (true);

-- feature_sections: only admins can write
DROP POLICY IF EXISTS "admin_manage_feature_sections" ON public.feature_sections;
CREATE POLICY "admin_manage_feature_sections"
ON public.feature_sections
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_sections_updated_at ON public.feature_sections;
CREATE TRIGGER update_feature_sections_updated_at
  BEFORE UPDATE ON public.feature_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. MOCK DATA

-- Create admin user
DO $$
DECLARE
  admin_uuid UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin@schooldesk.com', crypt('admin123', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'SchoolDesk Admin', 'role', 'admin'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[], 'role', 'admin'),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Admin user creation skipped: %', SQLERRM;
END $$;

-- Seed feature_sections with default content
INSERT INTO public.feature_sections (
  section_order, section_key, icon, title, subtitle, description,
  features, highlight, design_insight_label, design_insight_description,
  screen_image, screen_alt, accent_color
) VALUES
(
  0, 'overview', 'HomeIcon',
  'Overview',
  'Everything in one intelligent dashboard',
  'From the moment you log in, SchoolDesk gives every user — admin, teacher, parent, or student — a personalized view of what matters most to them. No clutter, no confusion.',
  '[{"text":"Role-based personalized dashboards"},{"text":"Live school summary for administrators"},{"text":"Smart alerts for circulars and events"},{"text":"Real-time synced academic calendars"}]'::jsonb,
  'One login. Every role. Zero confusion.',
  'Design Decision',
  'Each stakeholder sees only what they need — reducing cognitive load and increasing daily active usage by 3×.',
  'https://img.rocket.new/generatedImages/rocket_gen_img_10e7ed2b2-1772158696344.png',
  'Dashboard interface showing school management overview with clean navigation on a light background',
  '#F59E0B'
),
(
  1, 'academics', 'AcademicCapIcon',
  'Academics',
  'Attendance, homework, and grades — all automated',
  'Teachers take attendance in seconds, assign homework with rubrics and deadlines, and track every student''s progress over time. Students see their timetable, goals, and remarks in one organized space.',
  '[{"text":"One-tap attendance with offline support"},{"text":"Homework assignment with deadlines and rubrics"},{"text":"Progress tracking with teacher remarks"},{"text":"Curriculum and timetable management"}]'::jsonb,
  'Teachers save 2+ hours every week on admin work.',
  'Insight',
  'Offline-first attendance means teachers in low-connectivity areas never lose data — syncs automatically when back online.',
  'https://img.rocket.new/generatedImages/rocket_gen_img_1ccd5cec6-1773800269250.png',
  'Academic management screen showing student attendance records and homework assignments on a bright classroom background',
  '#3B82F6'
),
(
  2, 'finance', 'CurrencyDollarIcon',
  'Finance',
  'School fees managed without extra software',
  'Generate customizable invoices, automate recurring fee charges, and let parents pay directly through the app. The built-in accounting system gives finance staff complete visibility without needing a separate tool.',
  '[{"text":"Customizable invoice generation"},{"text":"Automated recurring fee charges"},{"text":"Parent payment via mobile app"},{"text":"Real-time fee status and overdue alerts"}]'::jsonb,
  'Reduce fee collection time from weeks to days.',
  'Strategy',
  'Smart ID-based offline payments mean fee collection continues even during internet outages — critical for schools in developing regions.',
  'https://img.rocket.new/generatedImages/rocket_gen_img_163033c07-1775209911023.png',
  'Finance management interface showing invoice list and payment status with clean data visualization on light background',
  '#10B981'
),
(
  3, 'learning', 'BookOpenIcon',
  'Learning',
  'Live classes, content library, and assessments',
  'Join scheduled live sessions via Google Meet or Zoom in one tap. Access subject-wise PDFs, videos, and slides from a searchable library. Run objective and subjective tests with instant results and performance trends.',
  '[{"text":"One-tap Google Meet / Zoom joining"},{"text":"Searchable subject-wise content library"},{"text":"Online tests with instant auto-grading"},{"text":"Performance trend charts per student"}]'::jsonb,
  'Remote and in-person learning, unified in one place.',
  'Design Decision',
  'Students never need to switch apps — live class links, study materials, and test results all live inside SchoolDesk.',
  'https://img.rocket.new/generatedImages/rocket_gen_img_181c49c57-1772408652671.png',
  'E-learning interface showing video content library and live class schedule on a bright, modern educational background',
  '#8B5CF6'
),
(
  4, 'security', 'ShieldCheckIcon',
  'Security',
  'Enterprise-grade protection for student data',
  'Role-based access control, OTP verification, IP restrictions, and automated cloud backups protect your school''s data 24×7. QR-based visitor passes create contactless entry with complete audit trails.',
  '[{"text":"Role-based access — custom permissions per role"},{"text":"OTP and IP restriction authentication"},{"text":"Automated cloud backups every 24 hours"},{"text":"QR visitor passes with audit trail"}]'::jsonb,
  'GDPR-aligned. Audit-ready. Always on.',
  'Insight',
  'Custom roles (Head Teacher, Matron, Janitor) mean every staff member sees exactly what they need — nothing more, nothing less.',
  'https://img.rocket.new/generatedImages/rocket_gen_img_15c628da5-1768331335125.png',
  'Security dashboard showing access control settings and visitor log with dark professional interface on neutral background',
  '#EF4444'
)
ON CONFLICT (section_key) DO NOTHING;
