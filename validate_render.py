#!/usr/bin/env python3
"""
Validate render.yaml configuration file for Render.com deployment.
"""

import yaml
import sys

def validate_render_yaml(filepath='render.yaml'):
    """Validate render.yaml structure and required fields."""
    
    try:
        with open(filepath, 'r') as f:
            config = yaml.safe_load(f)
        
        print("✅ YAML syntax is valid")
        
        # Check services
        if 'services' not in config:
            print("❌ Missing 'services' key")
            return False
        
        services = config['services']
        print(f"✅ Found {len(services)} service(s)")
        
        # Check each service
        for idx, service in enumerate(services):
            service_name = service.get('name', f'service-{idx}')
            print(f"\n  Service: {service_name}")
            
            # Required fields for web services
            if service.get('type') == 'web':
                required = ['name', 'env', 'buildCommand']
                if service.get('env') != 'static':
                    required.append('startCommand')
                else:
                    required.append('staticPublishPath')
                    
                for field in required:
                    if field in service:
                        print(f"    ✅ {field}: present")
                    else:
                        print(f"    ❌ {field}: missing")
                        return False
            
            # Check environment variables
            if 'envVars' in service:
                print(f"    ✅ envVars: {len(service['envVars'])} variable(s)")
        
        # Check databases
        if 'databases' in config:
            databases = config['databases']
            print(f"\n✅ Found {len(databases)} database(s)")
            
            for db in databases:
                db_name = db.get('name', 'unnamed')
                db_type = db.get('type', 'postgresql')
                print(f"  Database: {db_name} (type: {db_type})")
        
        print("\n" + "="*50)
        print("✅ render.yaml is valid and ready for deployment")
        print("="*50)
        return True
        
    except yaml.YAMLError as e:
        print(f"❌ YAML syntax error: {e}")
        return False
    except FileNotFoundError:
        print(f"❌ File not found: {filepath}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == '__main__':
    filepath = sys.argv[1] if len(sys.argv) > 1 else 'render.yaml'
    success = validate_render_yaml(filepath)
    sys.exit(0 if success else 1)
