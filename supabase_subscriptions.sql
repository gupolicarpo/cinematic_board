-- ─────────────────────────────────────────────────────────────────────────────
-- CINEMATIC BOARD — Subscription & Credits schema
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Main subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier                    text NOT NULL DEFAULT 'free'
                          CHECK (tier IN ('free','indie','pro','studio')),
  credits_balance         integer NOT NULL DEFAULT 80,   -- current spendable credits
  credits_monthly         integer NOT NULL DEFAULT 80,   -- credits granted on each reset
  stripe_customer_id      text,
  stripe_subscription_id  text,
  stripe_price_id         text,
  current_period_end      timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- 2. Credit transaction log (for auditing + debugging)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount       integer NOT NULL,            -- negative = spend, positive = top-up / reset
  operation    text NOT NULL,               -- e.g. 'kling_5s_std', 'veo_fast_8s', 'monthly_reset', 'topup'
  metadata     jsonb,                       -- optional: task_id, video_url, etc.
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON public.user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);

-- 4. RLS — users can only read their own row
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users read own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Server (service role) bypasses RLS — no extra policy needed.

-- 5. Auto-create free subscription on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, tier, credits_balance, credits_monthly)
  VALUES (NEW.id, 'free', 80, 80)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- ─────────────────────────────────────────────────────────────────────────────
-- TIER REFERENCE (for documentation — not enforced by DB)
-- free   : 80 credits/mo  — Kling Standard only, watermark
-- indie  : 900 credits/mo — All Kling + Veo Fast   — $19/mo
-- pro    : 2500 credits/mo — All Kling + All Veo   — $49/mo
-- studio : 6000 credits/mo — Everything + 3 seats  — $99/mo
-- ─────────────────────────────────────────────────────────────────────────────

-- CREDIT COSTS PER OPERATION
-- kling_5s_std   : 20 credits
-- kling_5s_pro   : 40 credits
-- kling_10s_std  : 40 credits
-- kling_10s_pro  : 80 credits
-- kling_lipsync  : 8 credits
-- kling_tts      : 2 credits
-- veo_fast_5s    : 45 credits
-- veo_fast_8s    : 70 credits
-- veo_std_5s     : 115 credits
-- veo_std_8s     : 185 credits
-- image_gen      : 3 credits
-- coherence      : 1 credit
