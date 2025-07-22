
-- Create admin_users table for better user management
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  region TEXT,
  permissions JSONB DEFAULT '{}',
  UNIQUE(user_id)
);

-- Create content_moderation table for flagged content
CREATE TABLE IF NOT EXISTS public.content_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'post', 'comment', 'profile'
  content_id UUID NOT NULL,
  content_text TEXT,
  author_id UUID REFERENCES auth.users(id),
  author_email TEXT,
  flagged_by UUID REFERENCES auth.users(id),
  flagged_reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'removed'
  moderator_id UUID REFERENCES auth.users(id),
  moderator_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shop_products table for shop management
CREATE TABLE IF NOT EXISTS public.shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  category TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'inactive'
  inventory_count INTEGER DEFAULT 0,
  images JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shop_orders table for order management
CREATE TABLE IF NOT EXISTS public.shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  total_amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
  shipping_address JSONB,
  order_items JSONB DEFAULT '[]',
  tracking_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_settings table for admin settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = $1 
    AND role = 'admin' 
    AND status = 'active'
  );
$$;

-- RLS Policies for admin_users
CREATE POLICY "Admins can view all admin users" ON public.admin_users
  FOR SELECT USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update admin users" ON public.admin_users
  FOR UPDATE USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can insert admin users" ON public.admin_users
  FOR INSERT WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete admin users" ON public.admin_users
  FOR DELETE USING (public.is_admin_user(auth.uid()));

-- RLS Policies for content_moderation
CREATE POLICY "Admins can manage content moderation" ON public.content_moderation
  FOR ALL USING (public.is_admin_user(auth.uid()));

-- RLS Policies for shop_products
CREATE POLICY "Admins can manage shop products" ON public.shop_products
  FOR ALL USING (public.is_admin_user(auth.uid()));

-- RLS Policies for shop_orders
CREATE POLICY "Admins can view all orders" ON public.shop_orders
  FOR SELECT USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update orders" ON public.shop_orders
  FOR UPDATE USING (public.is_admin_user(auth.uid()));

-- RLS Policies for system_settings
CREATE POLICY "Admins can manage system settings" ON public.system_settings
  FOR ALL USING (public.is_admin_user(auth.uid()));

-- Insert default admin user (replace with actual admin email)
INSERT INTO public.admin_users (user_id, email, role, status) 
SELECT id, email, 'admin', 'active' 
FROM auth.users 
WHERE email ILIKE '%admin%' 
ON CONFLICT (user_id) DO UPDATE SET 
  role = 'admin', 
  status = 'active',
  updated_at = NOW();

-- Insert some sample system settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('site_maintenance', '{"enabled": false, "message": ""}', 'Site maintenance mode settings'),
('email_notifications', '{"enabled": true, "admin_email": "admin@wheelsandwins.com"}', 'Email notification settings'),
('user_registration', '{"enabled": true, "require_approval": false}', 'User registration settings')
ON CONFLICT (setting_key) DO NOTHING;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_moderation_updated_at BEFORE UPDATE ON public.content_moderation
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shop_products_updated_at BEFORE UPDATE ON public.shop_products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shop_orders_updated_at BEFORE UPDATE ON public.shop_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
