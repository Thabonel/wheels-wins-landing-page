ALTER TABLE public.content_moderation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users can view all content moderation" ON public.content_moderation;
DROP POLICY IF EXISTS "Admin users can insert content moderation" ON public.content_moderation;
DROP POLICY IF EXISTS "Admin users can update content moderation" ON public.content_moderation;
DROP POLICY IF EXISTS "Admin users can delete content moderation" ON public.content_moderation;

CREATE POLICY "Admin users can view all content moderation"
ON public.content_moderation FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.email LIKE '%@wheelsandwins.%' OR
      auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com') OR
      (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  )
);

CREATE POLICY "Admin users can insert content moderation"
ON public.content_moderation FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.email LIKE '%@wheelsandwins.%' OR
      auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com') OR
      (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  )
);

CREATE POLICY "Admin users can update content moderation"
ON public.content_moderation FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.email LIKE '%@wheelsandwins.%' OR
      auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com') OR
      (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  )
);

CREATE POLICY "Admin users can delete content moderation"
ON public.content_moderation FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.email LIKE '%@wheelsandwins.%' OR
      auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com') OR
      (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  )
);