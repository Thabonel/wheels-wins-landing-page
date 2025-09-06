def handle_onboarding(data: dict) -> str:
    """
    Accepts user onboarding data and inserts it into the Supabase table `onboarding_responses`.
    Required fields: full_name, nickname, email, region, travel_style, vehicle_type, make_model_year, fuel_type, daily_drive_limit, towing_info, second_vehicle, preferred_camp_types, pet_info, accessibility_needs, age_range
    Returns a success or error message.
    """
    import os
    import httpx

    required = [
        "full_name",
        "nickname",
        "email",
        "region",
        "travel_style",
        "vehicle_type",
        "make_model_year",
        "fuel_type",
        "daily_drive_limit",
        "towing_info",
        "second_vehicle",
        "preferred_camp_types",
        "pet_info",
        "accessibility_needs",
        "age_range",
    ]

    missing = [k for k in required if k not in data]
    if missing:
        return f"Missing fields: {', '.join(missing)}"

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        return "Supabase credentials not configured."

    # Use unified profiles table instead of separate onboarding_responses
    url = f"{supabase_url}/rest/v1/profiles"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    # Map onboarding data to unified profile structure
    profile_data = {
        "email": data["email"],
        "full_name": data["full_name"],
        "nickname": data["nickname"],
        "region": data["region"],
        "vehicle_type": data["vehicle_type"],
        "make_model_year": data["make_model_year"],
        "fuel_type": data["fuel_type"],
        "travel_style": data["travel_style"],
        "daily_drive_limit": data["daily_drive_limit"],
        "towing_info": data["towing_info"],
        "second_vehicle": data["second_vehicle"],
        "preferred_camp_types": data["preferred_camp_types"].split(',') if data.get("preferred_camp_types") else [],
        "pet_info": data["pet_info"],
        "accessibility_needs": data["accessibility_needs"].split(',') if data.get("accessibility_needs") else [],
        "age_range": data["age_range"],
        "onboarding_completed": True,
        "onboarding_completed_at": "now()",
        "updated_at": "now()"
    }

    try:
        resp = httpx.post(url, json=profile_data, headers=headers, timeout=10)
        resp.raise_for_status()
        return "User profile created successfully with onboarding data."
    except Exception as e:
        return f"Error saving profile data: {e}"
