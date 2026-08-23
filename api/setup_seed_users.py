#!/usr/bin/env python3
"""
Setup script to create seed users in Supabase Auth.
Run this after migrations to populate demo users.
Usage: python api/setup_seed_users.py
"""

import os
from db import supabase

SEED_USERS = [
    {'email': 'admin1@vbc.com', 'password': 'Saludhealth', 'role': 'Admin'},
    {'email': 'admin2@vbc.com', 'password': 'Saludhealth', 'role': 'Admin'},
    {'email': 'user1@vbc.com', 'password': 'Saludhealth', 'role': 'Coder'},
    {'email': 'user2@vbc.com', 'password': 'Saludhealth', 'role': 'Coder'},
    {'email': 'user3@vbc.com', 'password': 'Saludhealth', 'role': 'Coder'},
]


def setup_seed_users():
    """Create seed users in Supabase Auth and mra_vbc_opps.users"""
    print("Creating seed users in Supabase Auth...")

    for user in SEED_USERS:
        email = user['email']
        password = user['password']
        role = user['role']

        try:
            # Create user in Supabase Auth
            auth_user = supabase.auth.admin.create_user({
                'email': email,
                'password': password,
                'email_confirm': True
            })

            if auth_user.user:
                print(f"✓ Created auth user: {email}")
            else:
                print(f"✗ Failed to create auth user: {email}")
                continue

        except Exception as e:
            # User might already exist
            if 'already registered' in str(e).lower():
                print(f"⊘ Auth user already exists: {email}")
            else:
                print(f"✗ Error creating auth user {email}: {str(e)}")
                continue

        try:
            # Verify user exists in mra_vbc_opps.users
            result = supabase.schema('mra_vbc_opps').table('users').select('id').eq('email', email).execute()

            if result.data:
                print(f"✓ User record exists: {email} ({role})")
            else:
                print(f"⚠ User record missing for {email}, please run migrations first")

        except Exception as e:
            print(f"✗ Error verifying user {email}: {str(e)}")

    print("\nSetup complete!")
    print("Demo credentials:")
    for user in SEED_USERS:
        print(f"  {user['email']} / {user['password']}")


if __name__ == '__main__':
    setup_seed_users()
