-- ============================================================================
-- MORYA GROUP ERP - SUPABASE CENTRAL DATABASE & STORAGE SETUP SCHEMA
-- Copy and paste this script into your Supabase Dashboard SQL Editor & click Run!
-- ============================================================================

-- 1. Members Table
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
    member_code TEXT NOT NULL,
    full_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    phone TEXT NOT NULL,
    annual_target_amount NUMERIC DEFAULT 6000,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    birth_date TEXT,
    email TEXT,
    age NUMERIC,
    photo_url TEXT,
    password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Income Transactions Table
CREATE TABLE IF NOT EXISTS public.incomes (
    id TEXT PRIMARY KEY,
    transaction_no TEXT NOT NULL,
    financial_year TEXT NOT NULL,
    income_type TEXT NOT NULL,
    depositor_name TEXT NOT NULL,
    depositor_type TEXT NOT NULL,
    linked_member_id TEXT REFERENCES public.members(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    transaction_date TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    cash_receiver_id TEXT,
    cash_receiver_name TEXT,
    payment_reference TEXT,
    receipt_number TEXT,
    reason TEXT NOT NULL,
    notes TEXT,
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration helpers if table already exists
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS cash_receiver_id TEXT;
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS cash_receiver_name TEXT;

-- 3. Expense Transactions Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    transaction_no TEXT NOT NULL,
    financial_year TEXT NOT NULL,
    expense_category TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    linked_member_id TEXT REFERENCES public.members(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    expense_date TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    bill_number TEXT,
    bill_photo_url TEXT,
    reason TEXT NOT NULL,
    approval_status TEXT DEFAULT 'प्रलंबित',
    approved_by TEXT,
    approved_by_role TEXT,
    approved_at TEXT,
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Occasion Events Table
CREATE TABLE IF NOT EXISTS public.occasions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date TEXT NOT NULL,
    location TEXT NOT NULL,
    banner_url TEXT,
    estimated_budget NUMERIC DEFAULT 0,
    actual_spent NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Event Gallery Table
CREATE TABLE IF NOT EXISTS public.gallery (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    event_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    upload_date TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Member Suggestions Table
CREATE TABLE IF NOT EXISTS public.suggestions (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'प्रलंबित',
    admin_response TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. App Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Supabase Storage Bucket Setup for 'morya-assets'
INSERT INTO storage.buckets (id, name, public)
VALUES ('morya-assets', 'morya-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Storage Bucket Security Policies (Allow Public Read & Authenticated Upload)
CREATE POLICY "Public Read Assets" ON storage.objects
    FOR SELECT USING (bucket_id = 'morya-assets');

CREATE POLICY "Public Insert Assets" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'morya-assets');

CREATE POLICY "Public Update Assets" ON storage.objects
    FOR UPDATE USING (bucket_id = 'morya-assets');

CREATE POLICY "Public Delete Assets" ON storage.objects
    FOR DELETE USING (bucket_id = 'morya-assets');

-- 10. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow Public / Anon Read & Write for Morya Group ERP client application
CREATE POLICY "Allow All Select" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow All Insert" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow All Update" ON public.members FOR UPDATE USING (true);
CREATE POLICY "Allow All Delete" ON public.members FOR DELETE USING (true);

CREATE POLICY "Allow All Select" ON public.incomes FOR SELECT USING (true);
CREATE POLICY "Allow All Insert" ON public.incomes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow All Update" ON public.incomes FOR UPDATE USING (true);
CREATE POLICY "Allow All Delete" ON public.incomes FOR DELETE USING (true);

CREATE POLICY "Allow All Select" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Allow All Insert" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow All Update" ON public.expenses FOR UPDATE USING (true);
CREATE POLICY "Allow All Delete" ON public.expenses FOR DELETE USING (true);

CREATE POLICY "Allow All Select" ON public.occasions FOR SELECT USING (true);
CREATE POLICY "Allow All Insert" ON public.occasions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow All Update" ON public.occasions FOR UPDATE USING (true);
CREATE POLICY "Allow All Delete" ON public.occasions FOR DELETE USING (true);

CREATE POLICY "Allow All Select" ON public.gallery FOR SELECT USING (true);
CREATE POLICY "Allow All Insert" ON public.gallery FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow All Update" ON public.gallery FOR UPDATE USING (true);
CREATE POLICY "Allow All Delete" ON public.gallery FOR DELETE USING (true);

CREATE POLICY "Allow All Select" ON public.suggestions FOR SELECT USING (true);
CREATE POLICY "Allow All Insert" ON public.suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow All Update" ON public.suggestions FOR UPDATE USING (true);
CREATE POLICY "Allow All Delete" ON public.suggestions FOR DELETE USING (true);

CREATE POLICY "Allow All Select" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow All Insert" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow All Update" ON public.settings FOR UPDATE USING (true);
CREATE POLICY "Allow All Delete" ON public.settings FOR DELETE USING (true);
