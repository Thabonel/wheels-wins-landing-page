ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_usage_warnings BOOLEAN DEFAULT true;

ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS quota_tier TEXT DEFAULT 'standard';

COMMENT ON COLUMN profiles.show_usage_warnings IS 'Whether to show usage warning toasts to this user';
COMMENT ON COLUMN user_subscriptions.quota_tier IS 'Quota tier: standard, power_user, unlimited';

CREATE OR REPLACE FUNCTION initialize_user_quota()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_usage_quotas (user_id, subscription_tier, monthly_query_limit)
    VALUES (
        NEW.id,
        COALESCE(
            (SELECT plan_type FROM user_subscriptions WHERE user_id = NEW.id LIMIT 1),
            'free_trial'
        ),
        CASE
            WHEN (SELECT plan_type FROM user_subscriptions WHERE user_id = NEW.id LIMIT 1) = 'free_trial' THEN 50
            WHEN (SELECT plan_type FROM user_subscriptions WHERE user_id = NEW.id LIMIT 1) = 'monthly' THEN 100
            WHEN (SELECT plan_type FROM user_subscriptions WHERE user_id = NEW.id LIMIT 1) = 'annual' THEN 150
            WHEN (SELECT plan_type FROM user_subscriptions WHERE user_id = NEW.id LIMIT 1) = 'lifetime' THEN 200
            ELSE 100
        END
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER initialize_user_quota_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION initialize_user_quota();

CREATE OR REPLACE FUNCTION update_quota_on_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_usage_quotas
    SET
        subscription_tier = NEW.plan_type,
        monthly_query_limit = CASE
            WHEN NEW.plan_type = 'free_trial' THEN 50
            WHEN NEW.plan_type = 'monthly' THEN 100
            WHEN NEW.plan_type = 'annual' THEN 150
            WHEN NEW.plan_type = 'lifetime' THEN 200
            ELSE 100
        END
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quota_on_subscription_change_trigger
    AFTER INSERT OR UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_quota_on_subscription_change();
