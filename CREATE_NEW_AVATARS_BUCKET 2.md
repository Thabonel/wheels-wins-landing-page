# 🚨 URGENT: Create New Avatars Bucket

The storage permissions issue is at the Supabase platform level. We need to create a NEW bucket through the Supabase Dashboard.

## Steps to Fix:

### 1. Go to Supabase Storage Dashboard
**URL**: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/storage/buckets

### 2. Create New Bucket
Click **"New bucket"** and enter:
- **Name**: `avatars` 
- **Public bucket**: ✅ Enable (toggle ON)
- **File size limit**: 10MB (or 10485760 bytes)
- **Allowed MIME types**: 
  ```
  image/jpeg
  image/jpg
  image/png
  image/gif
  image/webp
  ```

### 3. Click "Create bucket"

### 4. Set Bucket Policies (IMPORTANT!)
After creating, click on the `avatars` bucket and go to **Policies** tab:

1. Click **"New policy"** 
2. Select **"For full customization"**
3. **Policy name**: `Allow all for authenticated users`
4. **Target roles**: Select `authenticated`
5. **WITH CHECK expression**: `true`
6. **USING expression**: `true`
7. **Allowed operations**: Check ALL (SELECT, INSERT, UPDATE, DELETE)
8. Click **"Review"** then **"Save policy"**

### 5. Create Public Access Policy
1. Click **"New policy"** again
2. **Policy name**: `Public read access`
3. **Target roles**: Select `anon`
4. **USING expression**: `true`
5. **Allowed operations**: Check only SELECT
6. Click **"Review"** then **"Save policy"**

## Alternative: Run this SQL After Creating Bucket

If the Dashboard doesn't work, run this in SQL Editor after creating the bucket:

```sql
-- Grant all permissions to authenticated users for the new avatars bucket
CREATE POLICY "Authenticated can do everything in avatars" ON storage.objects
FOR ALL 
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Allow public to read
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT
TO public  
USING (bucket_id = 'avatars');

-- Verify it worked
SELECT COUNT(*) FROM storage.buckets WHERE id = 'avatars';
```

## Why This Works

Creating a NEW bucket through the Dashboard ensures:
1. Proper initialization of storage permissions
2. Correct owner assignment
3. Platform-level configuration
4. Bypasses any cached permission issues with old bucket

## Testing

After creating the bucket, test the upload immediately. The code has been updated to use the `avatars` bucket instead of `profile-images`.

---

**⚠️ IMPORTANT**: The code now references `avatars` bucket, not `profile-images`. Make sure to create the bucket with this exact name!