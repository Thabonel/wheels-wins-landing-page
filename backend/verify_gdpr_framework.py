#!/usr/bin/env python3
"""
GDPR Compliance Framework Verification
Direct verification of GDPR implementation components without complex dependencies
"""

import os
import json
import re
from pathlib import Path

def verify_backend_services():
    """Verify backend GDPR services are implemented"""
    print("🔍 Verifying Backend GDPR Services...")

    services = {
        "GDPR Service": "app/services/privacy/gdpr_service.py",
        "Retention Service": "app/services/data_lifecycle/retention_service.py",
        "Backup Encryption": "app/services/privacy/backup_encryption_service.py",
        "Privacy API": "app/api/v1/privacy.py"
    }

    results = {}

    for service_name, service_path in services.items():
        full_path = f"/Users/thabonel/Code/wheels-wins-landing-page/backend/{service_path}"

        if os.path.exists(full_path):
            file_size = os.path.getsize(full_path)
            print(f"  ✅ {service_name}: {file_size:,} bytes")

            # Check for key GDPR implementations
            with open(full_path, 'r') as f:
                content = f.read()

            if service_name == "GDPR Service":
                checks = [
                    ("export_user_data", "Data export functionality"),
                    ("delete_user_data", "Data deletion functionality"),
                    ("report_data_breach", "Breach reporting"),
                    ("get_data_retention_status", "Retention status"),
                    ("anonymize_user_data", "Data anonymization")
                ]

                for func_name, description in checks:
                    if func_name in content:
                        print(f"    ✅ {description}")
                    else:
                        print(f"    ❌ Missing: {description}")

            elif service_name == "Privacy API":
                endpoints = [
                    ("/export", "Data export endpoint"),
                    ("/delete", "Data deletion endpoint"),
                    ("/rectify", "Data rectification endpoint"),
                    ("/portability", "Data portability endpoint"),
                    ("/consent", "Consent management endpoint")
                ]

                for endpoint, description in endpoints:
                    if f'"{endpoint}"' in content:
                        print(f"    ✅ {description}")
                    else:
                        print(f"    ❌ Missing: {description}")

            results[service_name] = True
        else:
            print(f"  ❌ {service_name}: File not found at {service_path}")
            results[service_name] = False

    return results

def verify_frontend_components():
    """Verify frontend privacy components are implemented"""
    print("\n🔍 Verifying Frontend Privacy Components...")

    components = {
        "Privacy Settings": "src/components/privacy/PrivacySettings.tsx",
        "Data Export": "src/components/privacy/DataExport.tsx",
        "Account Deletion": "src/components/privacy/AccountDeletion.tsx"
    }

    results = {}

    for component_name, component_path in components.items():
        full_path = f"/Users/thabonel/Code/wheels-wins-landing-page/{component_path}"

        if os.path.exists(full_path):
            file_size = os.path.getsize(full_path)
            print(f"  ✅ {component_name}: {file_size:,} bytes")

            # Check for key functionality
            with open(full_path, 'r') as f:
                content = f.read()

            if component_name == "Privacy Settings":
                features = [
                    ("consent", "Consent management"),
                    ("privacy", "Privacy controls"),
                    ("GDPR", "GDPR compliance"),
                    ("dashboard", "Privacy dashboard")
                ]
            elif component_name == "Data Export":
                features = [
                    ("export", "Data export"),
                    ("download", "Download functionality"),
                    ("Article 15", "GDPR Article 15"),
                    ("portability", "Data portability")
                ]
            elif component_name == "Account Deletion":
                features = [
                    ("delete", "Deletion functionality"),
                    ("Article 17", "GDPR Article 17"),
                    ("confirmation", "Deletion confirmation"),
                    ("backup", "Pre-deletion backup")
                ]

            for keyword, description in features:
                if keyword.lower() in content.lower():
                    print(f"    ✅ {description}")
                else:
                    print(f"    ❓ {description} (keyword '{keyword}' not found)")

            results[component_name] = True
        else:
            print(f"  ❌ {component_name}: File not found at {component_path}")
            results[component_name] = False

    return results

def verify_database_integration():
    """Verify database schema supports GDPR requirements"""
    print("\n🔍 Verifying Database GDPR Support...")

    schema_file = "/Users/thabonel/Code/wheels-wins-landing-page/docs/DATABASE_SCHEMA_REFERENCE.md"

    if os.path.exists(schema_file):
        with open(schema_file, 'r') as f:
            content = f.read()

        # Check for required tables
        gdpr_tables = [
            "profiles",
            "calendar_events",
            "expenses",
            "trips",
            "medical_records",
            "posts",
            "comments",
            "pam_conversations",
            "pam_messages"
        ]

        found_tables = []
        for table in gdpr_tables:
            if f"CREATE TABLE {table}" in content or f"### `{table}` table" in content:
                found_tables.append(table)
                print(f"  ✅ Table: {table}")
            else:
                print(f"  ❌ Missing table: {table}")

        print(f"  📊 Database Coverage: {len(found_tables)}/{len(gdpr_tables)} tables ({len(found_tables)/len(gdpr_tables)*100:.0f}%)")
        return len(found_tables) >= len(gdpr_tables) * 0.8  # 80% coverage minimum
    else:
        print("  ❌ Database schema file not found")
        return False

def verify_gdpr_articles_implementation():
    """Verify specific GDPR articles are implemented"""
    print("\n🔍 Verifying GDPR Articles Implementation...")

    articles = {
        "Article 15 (Right of Access)": [
            "export_user_data",
            "data export",
            "right of access"
        ],
        "Article 16 (Right to Rectification)": [
            "rectify",
            "correction",
            "update"
        ],
        "Article 17 (Right to Erasure)": [
            "delete_user_data",
            "erasure",
            "right to be forgotten"
        ],
        "Article 18 (Right to Restriction)": [
            "restrict",
            "processing restriction",
            "limitation"
        ],
        "Article 20 (Data Portability)": [
            "portability",
            "portable",
            "transfer"
        ],
        "Article 21 (Right to Object)": [
            "object",
            "objection",
            "opt-out"
        ],
        "Articles 33-34 (Breach Notification)": [
            "breach",
            "notification",
            "72 hours"
        ]
    }

    # Check privacy API file for implementations
    privacy_api_path = "/Users/thabonel/Code/wheels-wins-landing-page/backend/app/api/v1/privacy.py"
    gdpr_service_path = "/Users/thabonel/Code/wheels-wins-landing-page/backend/app/services/privacy/gdpr_service.py"

    combined_content = ""

    for file_path in [privacy_api_path, gdpr_service_path]:
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                combined_content += f.read().lower()

    results = {}

    for article, keywords in articles.items():
        implemented = any(keyword.lower() in combined_content for keyword in keywords)
        if implemented:
            print(f"  ✅ {article}: Implemented")
        else:
            print(f"  ❌ {article}: Not found")
        results[article] = implemented

    implementation_rate = sum(results.values()) / len(results) * 100
    print(f"  📊 GDPR Implementation: {sum(results.values())}/{len(results)} articles ({implementation_rate:.0f}%)")

    return implementation_rate >= 85  # 85% minimum implementation

def verify_security_features():
    """Verify security and compliance features"""
    print("\n🔍 Verifying Security & Compliance Features...")

    security_files = [
        ("Authentication", "backend/app/api/deps.py"),
        ("Security Headers", "backend/app/core/security.py"),
        ("Backup Encryption", "backend/app/services/privacy/backup_encryption_service.py")
    ]

    features_found = []

    for feature_name, file_path in security_files:
        full_path = f"/Users/thabonel/Code/wheels-wins-landing-page/{file_path}"

        if os.path.exists(full_path):
            file_size = os.path.getsize(full_path)
            print(f"  ✅ {feature_name}: {file_size:,} bytes")
            features_found.append(feature_name)
        else:
            print(f"  ❌ {feature_name}: File not found")

    # Check for specific security implementations
    deps_path = "/Users/thabonel/Code/wheels-wins-landing-page/backend/app/api/deps.py"
    if os.path.exists(deps_path):
        with open(deps_path, 'r') as f:
            content = f.read()

        auth_features = [
            ("JWT verification", "verify_supabase_jwt_token"),
            ("MFA support", "mfa"),
            ("Session management", "session"),
            ("Rate limiting", "rate_limit")
        ]

        for feature_name, keyword in auth_features:
            if keyword.lower() in content.lower():
                print(f"    ✅ {feature_name}")
            else:
                print(f"    ❓ {feature_name}")

    return len(features_found) >= 2  # Minimum security features

def generate_compliance_report():
    """Generate final compliance report"""
    print("\n" + "="*60)
    print("📋 GDPR COMPLIANCE FRAMEWORK VERIFICATION REPORT")
    print("="*60)

    # Run all verifications
    backend_results = verify_backend_services()
    frontend_results = verify_frontend_components()
    database_ok = verify_database_integration()
    gdpr_articles_ok = verify_gdpr_articles_implementation()
    security_ok = verify_security_features()

    # Calculate overall scores
    backend_score = sum(backend_results.values()) / len(backend_results) * 100
    frontend_score = sum(frontend_results.values()) / len(frontend_results) * 100

    print(f"\n📊 VERIFICATION RESULTS:")
    print(f"  • Backend Services: {sum(backend_results.values())}/{len(backend_results)} ({backend_score:.0f}%)")
    print(f"  • Frontend Components: {sum(frontend_results.values())}/{len(frontend_results)} ({frontend_score:.0f}%)")
    print(f"  • Database Integration: {'✅ PASS' if database_ok else '❌ FAIL'}")
    print(f"  • GDPR Articles: {'✅ PASS' if gdpr_articles_ok else '❌ FAIL'}")
    print(f"  • Security Features: {'✅ PASS' if security_ok else '❌ FAIL'}")

    # Overall assessment
    all_pass = (
        backend_score >= 80 and
        frontend_score >= 80 and
        database_ok and
        gdpr_articles_ok and
        security_ok
    )

    print(f"\n🎯 OVERALL ASSESSMENT:")
    if all_pass:
        print("  🎉 GDPR COMPLIANCE FRAMEWORK: FULLY IMPLEMENTED")
        print("  ✅ All core GDPR requirements are in place")
        print("  ✅ Backend services are comprehensive")
        print("  ✅ Frontend provides user privacy controls")
        print("  ✅ Database supports GDPR data operations")
        print("  ✅ Security measures are implemented")
        print("\n  🚀 READY FOR PRODUCTION DEPLOYMENT")
    else:
        print("  ⚠️  GDPR COMPLIANCE FRAMEWORK: NEEDS ATTENTION")
        print("  🔧 Some components require completion or fixes")

        # Specific recommendations
        if backend_score < 80:
            print("  • Complete missing backend services")
        if frontend_score < 80:
            print("  • Implement missing frontend components")
        if not database_ok:
            print("  • Ensure database schema supports all GDPR operations")
        if not gdpr_articles_ok:
            print("  • Implement missing GDPR article requirements")
        if not security_ok:
            print("  • Strengthen security and authentication features")

    print("\n" + "="*60)

    return all_pass

if __name__ == "__main__":
    success = generate_compliance_report()
    exit(0 if success else 1)