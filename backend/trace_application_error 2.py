#!/usr/bin/env python3
"""
Trace the Application-Level Error
Since RLS is disabled and service client works, the error must be in the app code
"""

def trace_application_flow():
    """Trace exactly where in the application the error occurs"""
    
    print("🔍 TRACING APPLICATION-LEVEL ERROR")
    print("=" * 50)
    print("Since RLS is disabled and service client works,")
    print("the error must be happening in the application code")
    
    print("\n📋 Let's trace the exact flow:")
    print("1. Frontend sends calendar event data")
    print("2. Backend API receives it (/you/calendar/events)")
    print("3. you_node.create_calendar_event() is called")
    print("4. Supabase client tries to insert")
    print("5. ERROR occurs here")
    
    print("\n🔍 CRITICAL QUESTIONS:")
    print("1. Is your app using the ANON key or SERVICE key?")
    print("2. Is auth.uid() returning a valid user ID?")
    print("3. Is the app properly authenticated?")
    
    # Check the actual application code for clues
    return analyze_application_code()

def analyze_application_code():
    """Analyze the application code for potential issues"""
    
    print("\n🔧 ANALYZING APPLICATION CODE:")
    print("=" * 40)
    
    # Check you_node.py for any admin checking
    try:
        with open('/Users/thabonel/Documents/Wheels and Wins/wheels-wins-landing-page/backend/app/nodes/you_node.py', 'r') as f:
            content = f.read()
            
        print("📄 Checking you_node.py...")
        
        # Look for admin references
        if 'admin' in content.lower():
            print("⚠️  Found 'admin' references in you_node.py")
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if 'admin' in line.lower():
                    print(f"   Line {i+1}: {line.strip()}")
        else:
            print("✅ No admin references in you_node.py")
        
        # Look for service client usage
        if 'service' in content.lower():
            print("⚠️  Found 'service' references in you_node.py")
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if 'service' in line.lower() and 'client' in line.lower():
                    print(f"   Line {i+1}: {line.strip()}")
        
        # Look for the actual calendar event creation
        if 'create_calendar_event' in content:
            print("📍 Found create_calendar_event method")
            lines = content.split('\n')
            in_method = False
            method_lines = []
            
            for i, line in enumerate(lines):
                if 'def create_calendar_event' in line:
                    in_method = True
                    method_lines = [f"Line {i+1}: {line}"]
                elif in_method:
                    method_lines.append(f"Line {i+1}: {line}")
                    if line.strip().startswith('def ') and 'create_calendar_event' not in line:
                        break
                    if len(method_lines) > 50:  # Limit output
                        break
            
            print("📝 create_calendar_event method excerpt:")
            for line in method_lines[:20]:  # Show first 20 lines
                print(f"   {line}")
    
    except Exception as e:
        print(f"❌ Could not analyze you_node.py: {e}")
    
    return check_client_initialization()

def check_client_initialization():
    """Check how Supabase clients are initialized"""
    
    print("\n🔧 CHECKING CLIENT INITIALIZATION:")
    print("=" * 40)
    
    try:
        with open('/Users/thabonel/Documents/Wheels and Wins/wheels-wins-landing-page/backend/app/database/supabase_client.py', 'r') as f:
            content = f.read()
        
        print("📄 Checking supabase_client.py...")
        
        if 'service' in content.lower():
            print("📍 Found service client references:")
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if 'service' in line.lower():
                    print(f"   Line {i+1}: {line.strip()}")
        
        # Look for admin checking
        if 'admin' in content.lower():
            print("⚠️  Found admin references:")
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if 'admin' in line.lower():
                    print(f"   Line {i+1}: {line.strip()}")
    
    except Exception as e:
        print(f"❌ Could not analyze supabase_client.py: {e}")
    
    return generate_debugging_steps()

def generate_debugging_steps():
    """Generate specific debugging steps"""
    
    print("\n🎯 DEBUGGING STEPS:")
    print("=" * 30)
    
    print("1. Check if your app is using the SERVICE key instead of ANON key")
    print("2. Check if there's authentication middleware causing issues")
    print("3. Check if the you_node is trying to use service client")
    print("4. Add logging to see exactly which client is being used")
    
    print("\n🔧 IMMEDIATE TESTS:")
    print("=" * 20)
    
    print("Test 1: Check which Supabase client your app is actually using")
    print("Test 2: Check if user is properly authenticated")
    print("Test 3: Check if there are any middleware intercepting requests")
    
    print("\n📝 CODE TO ADD FOR DEBUGGING:")
    print("Add this to your you_node.py create_calendar_event method:")
    print("""
# Add at the start of create_calendar_event method:
print(f"DEBUG: user_id = {user_id}")
print(f"DEBUG: client type = {type(self.supabase)}")
print(f"DEBUG: client URL = {getattr(self.supabase, 'url', 'unknown')}")
print(f"DEBUG: about to insert event_data = {event_data}")

# Add just before the insert:
print("DEBUG: About to call supabase.table('calendar_events').insert()")
""")
    
    return "needs_app_debugging"

def main():
    print("🚀 Starting Application Error Trace...")
    
    result = trace_application_flow()
    
    print(f"\n🎯 CONCLUSION:")
    print("Since RLS is disabled and service client works,")
    print("but your app still fails, the issue is:")
    print("1. App code is using wrong client")
    print("2. Authentication issues")
    print("3. Hidden middleware or interceptors")
    print("4. App code has admin checking we missed")
    
    print(f"\n📋 NEXT STEPS:")
    print("1. Add debug logging to your you_node.py")
    print("2. Check which Supabase client is actually being used")
    print("3. Verify user authentication in the app")
    print("4. Check for any auth middleware")

if __name__ == "__main__":
    main()