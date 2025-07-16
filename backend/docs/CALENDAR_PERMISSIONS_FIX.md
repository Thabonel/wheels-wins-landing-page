# Calendar Permissions Fix

## Problem
Users were experiencing a "permission denied to set role 'admin'" error when trying to save calendar events. This was preventing calendar functionality from working properly.

## Root Cause
The issue was caused by:
1. **Missing Service Role Key**: The system was only using the Supabase anonymous key (`SUPABASE_KEY`) for all operations
2. **Insufficient Privileges**: Admin users need elevated privileges to perform certain calendar operations
3. **RLS Policy Conflicts**: Row Level Security policies were blocking admin operations

## Solution Implemented

### 1. Added Service Role Key Support
```python
# In app/core/config.py
SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
```

### 2. Created Service Client
```python
# In app/database/supabase_client.py
def get_supabase_service() -> Client:
    """Get Supabase service client for admin operations"""
    if not supabase_service_client:
        return init_supabase_service()
    return supabase_service_client
```

### 3. Updated Calendar Event Creation
```python
# In app/nodes/you_node.py
# Check if user is admin and use appropriate client
is_admin = await self._is_user_admin(user_id)
client_to_use = self.supabase_service if is_admin else self.supabase
```

### 4. Added Admin Role Validation
```python
async def _is_user_admin(self, user_id: str) -> bool:
    """Check if user has admin privileges"""
    try:
        admin_check = self.supabase.table('admin_users').select('role').eq(
            'user_id', user_id
        ).execute()
        return bool(admin_check.data)
    except Exception as e:
        self.logger.warning(f"Error checking admin status for user {user_id}: {e}")
        return False
```

## Setup Instructions

### 1. Get Your Service Role Key
1. Go to your Supabase dashboard
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (not the anon key)
4. **Important**: Keep this key secure!

### 2. Add to Environment Variables
Add to your `.env` file:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. Quick Setup Script
Run the provided script:
```bash
python fix_calendar_permissions.py
```

### 4. Restart Your Server
```bash
# If using Docker
docker-compose restart backend

# If running locally
# Stop the server and restart it
```

## Verification

### Test Calendar Event Creation
1. Create a calendar event as a regular user
2. Create a calendar event as an admin user
3. Both should work without the "permission denied" error

### Check Logs
Look for these log messages:
```
INFO - Database service initialized successfully
INFO - Supabase service client initialized successfully
INFO - Creating calendar event for user {user_id} (admin: {is_admin})
```

## Security Considerations

### Service Role Key Security
- **Never commit** the service role key to version control
- Store it securely in your deployment environment
- Use environment variables or secret management systems
- The service role key bypasses RLS policies

### Admin User Management
- Ensure admin users are properly configured in the `admin_users` table
- Regular users should not have admin privileges
- Admin operations are logged for audit purposes

## Troubleshooting

### Still Getting Permission Errors?
1. **Verify Service Key**: Double-check the service role key is correct
2. **Check Admin Users**: Ensure admin users exist in `admin_users` table
3. **RLS Policies**: Review Row Level Security policies for `calendar_events`
4. **Logs**: Check backend logs for detailed error messages

### Environment Variables
```bash
# Check if variables are loaded
echo $SUPABASE_SERVICE_ROLE_KEY

# Or in Python
import os
print(os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
```

### Database Issues
```sql
-- Check if admin_users table exists
SELECT * FROM admin_users LIMIT 1;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'calendar_events';
```

## Related Files
- `app/core/config.py` - Configuration settings
- `app/database/supabase_client.py` - Database client management
- `app/nodes/you_node.py` - Calendar event creation
- `app/services/database.py` - Database service methods
- `fix_calendar_permissions.py` - Setup script