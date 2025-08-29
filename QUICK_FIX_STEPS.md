# 🚀 QUICK FIX: Delete and Recreate Bucket

## Step 1: Delete Old Bucket
Go to: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/storage/buckets

1. Find `profile-images` bucket
2. Click the **3 dots menu** → **Delete bucket**
3. Confirm deletion

## Step 2: Create New Bucket
1. Click **"New bucket"**
2. Enter these EXACT settings:
   - **Name**: `avatars` (⚠️ MUST BE THIS NAME - code is updated)
   - **Public bucket**: ✅ ON (Toggle enabled)
   - **File size limit**: Leave empty or set to 10MB
   - **Allowed MIME types**: Leave empty (allows all)

3. Click **"Save"** or **"Create bucket"**

## Step 3: That's It!
The avatar upload should now work! The code is already updated to use the `avatars` bucket.

## Test It:
1. Go to your Profile page
2. Click "Choose Photo"
3. Select any image
4. It should upload successfully!

---

**Why this works**: Creating a fresh bucket through the Dashboard properly initializes all the storage permissions at the platform level, bypassing whatever corruption happened with the old bucket.