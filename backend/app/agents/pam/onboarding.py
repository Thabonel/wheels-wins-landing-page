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

        # NEW: Auto-create transition_profile if user is transitioning
        life_status = data.get("ask_life_status")
        user_id = data.get("user_id")

        if life_status == "transitioning" and user_id:
            departure_date = data.get("ask_transition_departure_date")

            # Create transition_profile record
            transition_profile_url = f"{supabase_url}/rest/v1/transition_profiles"
            transition_data = {
                "user_id": user_id,
                "departure_date": departure_date if departure_date else "2099-12-31",  # Far future if not set
                "current_phase": "planning",
                "transition_type": "full_time",
                "is_enabled": True,
                "auto_hide_after_departure": True,
                "hide_days_after_departure": 30,
            }

            try:
                transition_resp = httpx.post(transition_profile_url, json=transition_data, headers=headers, timeout=10)
                transition_resp.raise_for_status()
            except Exception as transition_error:
                # Don't fail the whole onboarding if transition profile creation fails
                print(f"Warning: Failed to create transition profile: {transition_error}")

        return "Onboarding data saved successfully."
    except Exception as e:
        return f"Error saving onboarding data: {e}"
