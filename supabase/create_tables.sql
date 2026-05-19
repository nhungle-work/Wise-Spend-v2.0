-- ============================================================
-- WiseSpend: Tạo bảng user_settings, wallets, budget_plans
-- Chạy file này trong Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. user_settings: lưu chu kỳ tháng + trạng thái onboarding
CREATE TABLE IF NOT EXISTS public.user_settings (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  cycle_start_day      int2 DEFAULT 1 CHECK (cycle_start_day >= 1 AND cycle_start_day <= 31),
  onboarding_completed boolean DEFAULT false,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- 2. wallets: nguồn tiền của user (mốc reset số dư)
CREATE TABLE IF NOT EXISTS public.wallets (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name             text NOT NULL,
  type             text CHECK (type IN ('bank', 'ewallet', 'cash')) DEFAULT 'bank',
  balance_snapshot bigint DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- 3. budget_plans: kế hoạch ngân sách theo danh mục
CREATE TABLE IF NOT EXISTS public.budget_plans (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category      text NOT NULL,
  monthly_limit bigint DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- Row Level Security (RLS) — mỗi user chỉ thấy data của mình
-- ============================================================

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_plans   ENABLE ROW LEVEL SECURITY;

-- user_settings policies
CREATE POLICY "users can manage own settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- wallets policies
CREATE POLICY "users can manage own wallets"
  ON public.wallets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- budget_plans policies
CREATE POLICY "users can manage own budget plans"
  ON public.budget_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Đã có sẵn: bảng user_sheets (kiểm tra cho chắc)
-- ============================================================
-- CREATE TABLE IF NOT EXISTS public.user_sheets (
--   id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
--   user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
--   sheet_id   text,
--   created_at timestamptz DEFAULT now()
-- );
