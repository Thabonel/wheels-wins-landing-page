
#!/usr/bin/env python3
"""
Script to help update environment variables for deployment.
"""

import os
import json
import sys
from typing import Dict, List, Optional

class EnvironmentUpdater:
    """Updates environment variables for different deployment platforms."""
    
    def __init__(self):
        self.required_vars = {
            'ENVIRONMENT': 'production',
            'OPENAI_API_KEY': None,
            'SUPABASE_URL': None,
            'SUPABASE_KEY': None,
            'SECRET_KEY': None,
            'REDIS_URL': None,
        }
        
        self.optional_vars = {
            'SENTRY_DSN': None,
            'LOG_LEVEL': 'INFO',
            'MAX_CONNECTIONS': '100',
            'RATE_LIMIT_PER_MINUTE': '60',
            'CORS_ORIGINS': 'https://your-frontend-domain.com',
        }
    
    def check_current_env(self) -> Dict[str, str]:
        """Check current environment variables."""
        current_env = {}
        all_vars = {**self.required_vars, **self.optional_vars}
        
        print("Current Environment Variables:")
        print("=" * 50)
        
        for var_name, default_value in all_vars.items():
            value = os.getenv(var_name, default_value)
            current_env[var_name] = value
            
            status = "✓" if value else "✗"
            print(f"{status} {var_name}: {value or 'NOT SET'}")
        
        return current_env
    
    def generate_render_config(self) -> Dict:
        """Generate Render.com environment configuration."""
        env_vars = []
        
        for var_name, default_value in self.required_vars.items():
            if var_name == 'SECRET_KEY':
                env_vars.append({
                    "key": var_name,
                    "generateValue": True
                })
            elif var_name == 'REDIS_URL':
                env_vars.append({
                    "key": var_name,
                    "fromService": {
                        "type": "redis",
                        "name": "pam-redis",
                        "property": "connectionString"
                    }
                })
            else:
                env_vars.append({
                    "key": var_name,
                    "sync": False
                })
        
        return {
            "envVars": env_vars
        }
    
    def generate_docker_env(self) -> str:
        """Generate Docker environment file."""
        env_content = []
        env_content.append("# PAM Backend Environment Variables")
        env_content.append("# Copy to .env and fill in actual values")
        env_content.append("")
        
        for var_name, default_value in {**self.required_vars, **self.optional_vars}.items():
            if default_value:
                env_content.append(f"{var_name}={default_value}")
            else:
                env_content.append(f"# {var_name}=your-{var_name.lower().replace('_', '-')}-here")
        
        return "\n".join(env_content)
    
    def generate_github_secrets(self) -> List[str]:
        """Generate list of GitHub secrets needed."""
        secrets = [
            "RENDER_API_KEY",
            "RENDER_SERVICE_ID",
            "VERCEL_TOKEN",
            "VERCEL_ORG_ID", 
            "VERCEL_PROJECT_ID",
        ]
        
        # Add all required environment variables
        secrets.extend(self.required_vars.keys())
        
        return secrets
    
    def validate_environment(self) -> bool:
        """Validate that all required environment variables are set."""
        missing_vars = []
        
        for var_name in self.required_vars.keys():
            if not os.getenv(var_name):
                missing_vars.append(var_name)
        
        if missing_vars:
            print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
            return False
        else:
            print("✅ All required environment variables are set")
            return True
    
    def create_env_template(self, filename: str = ".env.template"):
        """Create environment template file."""
        template_content = self.generate_docker_env()
        
        with open(filename, 'w') as f:
            f.write(template_content)
        
        print(f"Created environment template: {filename}")

def main():
    updater = EnvironmentUpdater()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "check":
            updater.check_current_env()
            updater.validate_environment()
        
        elif command == "render":
            config = updater.generate_render_config()
            print(json.dumps(config, indent=2))
        
        elif command == "docker":
            env_content = updater.generate_docker_env()
            print(env_content)
        
        elif command == "github":
            secrets = updater.generate_github_secrets()
            print("Required GitHub Secrets:")
            for secret in secrets:
                print(f"  - {secret}")
        
        elif command == "template":
            updater.create_env_template()
        
        elif command == "validate":
            is_valid = updater.validate_environment()
            sys.exit(0 if is_valid else 1)
        
        else:
            print(f"Unknown command: {command}")
            print_usage()
    
    else:
        print_usage()

def print_usage():
    print("Usage: python update_environment_vars.py <command>")
    print("Commands:")
    print("  check     - Check current environment variables")
    print("  render    - Generate Render.com configuration")
    print("  docker    - Generate Docker environment file")
    print("  github    - List required GitHub secrets")
    print("  template  - Create .env template file")
    print("  validate  - Validate current environment")

if __name__ == "__main__":
    main()
