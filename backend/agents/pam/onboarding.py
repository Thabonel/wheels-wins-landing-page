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

    url = f"{supabase_url}/rest/v1/onboarding_responses"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    try:
        resp = httpx.post(url, json=data, headers=headers, timeout=10)
        resp.raise_for_status()
        return "Onboarding data saved successfully."
    except Exception as e:
        return f"Error saving onboarding data: {e}"
