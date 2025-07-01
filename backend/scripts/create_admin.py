
#!/usr/bin/env python3
"""
Create admin user script for PAM backend.
"""

import sys
import os
import argparse
from uuid import UUID

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import get_supabase_client
from app.core.logging import get_logger

logger = get_logger(__name__)

class AdminCreator:
    def __init__(self):
        self.client = get_supabase_client()
    
    def create_admin(self, email: str, user_id: str = None):
        """Create admin user using the bootstrap function"""
        try:
            # Convert string UUID to UUID object if provided
            uuid_param = UUID(user_id) if user_id else None
            
            # Call the bootstrap function
            result = self.client.rpc(
                'bootstrap_admin_user',
                {
                    'user_email': email,
                    'user_uuid': str(uuid_param) if uuid_param else None
                }
            ).execute()
            
            if result.data:
                logger.info(f"✅ Successfully created/updated admin user: {email}")
                
                # Verify the admin was created
                admin_check = self.client.table('admin_users').select('*').eq('email', email).execute()
                if admin_check.data:
                    admin = admin_check.data[0]
                    logger.info(f"Admin Details:")
                    logger.info(f"  - User ID: {admin['user_id']}")
                    logger.info(f"  - Email: {admin['email']}")
                    logger.info(f"  - Role: {admin['role']}")
                    logger.info(f"  - Status: {admin['status']}")
                    logger.info(f"  - Created: {admin['created_at']}")
                else:
                    logger.warning("Admin created but verification failed")
                    
                return True
            else:
                logger.error("Failed to create admin user")
                return False
                
        except Exception as e:
            logger.error(f"Error creating admin user: {e}")
            return False
    
    def list_admins(self):
        """List all admin users"""
        try:
            result = self.client.table('admin_users').select('*').execute()
            
            if result.data:
                logger.info(f"Found {len(result.data)} admin user(s):")
                for admin in result.data:
                    logger.info(f"  - {admin['email']} ({admin['role']}) - {admin['status']}")
            else:
                logger.info("No admin users found")
                
        except Exception as e:
            logger.error(f"Error listing admin users: {e}")
    
    def remove_admin(self, email: str):
        """Remove admin user"""
        try:
            result = self.client.table('admin_users').delete().eq('email', email).execute()
            
            if result.data:
                logger.info(f"✅ Successfully removed admin user: {email}")
                return True
            else:
                logger.warning(f"Admin user not found or already removed: {email}")
                return False
                
        except Exception as e:
            logger.error(f"Error removing admin user: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description='Manage admin users for PAM')
    parser.add_argument('action', choices=['create', 'list', 'remove'], 
                       help='Action to perform')
    parser.add_argument('--email', type=str, help='Admin email address')
    parser.add_argument('--user-id', type=str, help='User UUID (optional for create)')
    
    args = parser.parse_args()
    
    admin_creator = AdminCreator()
    
    if args.action == 'create':
        if not args.email:
            logger.error("Email is required for creating admin user")
            sys.exit(1)
        
        success = admin_creator.create_admin(args.email, args.user_id)
        sys.exit(0 if success else 1)
        
    elif args.action == 'list':
        admin_creator.list_admins()
        
    elif args.action == 'remove':
        if not args.email:
            logger.error("Email is required for removing admin user")
            sys.exit(1)
        
        success = admin_creator.remove_admin(args.email)
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
