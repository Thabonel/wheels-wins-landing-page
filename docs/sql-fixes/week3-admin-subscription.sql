UPDATE public.user_subscriptions
SET
    plan_type = 'admin',
    status = 'active',
    trial_ends_at = NULL,
    updated_at = NOW()
WHERE user_id = '21a2151a-cd37-41d5-a1c7-124bb05e7a6a';

INSERT INTO public.user_subscriptions (user_id, plan_type, status, trial_ends_at)
VALUES ('21a2151a-cd37-41d5-a1c7-124bb05e7a6a', 'admin', 'active', NULL)
ON CONFLICT (user_id)
DO UPDATE SET
    plan_type = 'admin',
    status = 'active',
    trial_ends_at = NULL,
    updated_at = NOW();
