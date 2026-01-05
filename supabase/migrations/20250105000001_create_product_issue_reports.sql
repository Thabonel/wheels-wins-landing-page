-- Create product_issue_reports table for user-reported product issues
CREATE TABLE IF NOT EXISTS public.product_issue_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.affiliate_products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN (
    'incorrect_price',
    'out_of_stock',
    'discontinued',
    'broken_link',
    'wrong_image',
    'wrong_description',
    'other'
  )),
  notes TEXT,
  product_snapshot JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes for common queries
CREATE INDEX idx_product_issue_reports_product_id ON public.product_issue_reports(product_id);
CREATE INDEX idx_product_issue_reports_user_id ON public.product_issue_reports(user_id);
CREATE INDEX idx_product_issue_reports_status ON public.product_issue_reports(status);
CREATE INDEX idx_product_issue_reports_issue_type ON public.product_issue_reports(issue_type);
CREATE INDEX idx_product_issue_reports_created_at ON public.product_issue_reports(created_at DESC);

-- Enable RLS
ALTER TABLE public.product_issue_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can create reports (authenticated or anonymous)
CREATE POLICY "allow_insert_reports" ON public.product_issue_reports
  FOR INSERT
  WITH CHECK (true);

-- Users can view their own reports
CREATE POLICY "allow_view_own_reports" ON public.product_issue_reports
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all reports
CREATE POLICY "allow_admin_view_all_reports" ON public.product_issue_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.user_role IN ('super_admin', 'admin')
        AND admin_users.is_active = true
    )
  );

-- Admins can update reports (status, admin_notes, reviewed_at, reviewed_by)
CREATE POLICY "allow_admin_update_reports" ON public.product_issue_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.user_role IN ('super_admin', 'admin')
        AND admin_users.is_active = true
    )
  );

-- Admins can delete reports
CREATE POLICY "allow_admin_delete_reports" ON public.product_issue_reports
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.user_role IN ('super_admin', 'admin')
        AND admin_users.is_active = true
    )
  );

-- Update updated_at timestamp on updates
CREATE OR REPLACE FUNCTION public.update_product_issue_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_issue_reports_updated_at
  BEFORE UPDATE ON public.product_issue_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_issue_reports_updated_at();

-- Grant permissions
GRANT SELECT, INSERT ON public.product_issue_reports TO authenticated;
GRANT SELECT, INSERT ON public.product_issue_reports TO anon;
GRANT ALL ON public.product_issue_reports TO admin;
GRANT ALL ON public.product_issue_reports TO service_role;
