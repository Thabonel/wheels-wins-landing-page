# Pam V2 Tool Migration Matrix

Classifies all 96 V1 tools by disposition: **adapt** (wrap in V2), **merge** (combine into fewer tools), **replace** (new V2 tool replaces V1), **retire** (drop — redundant, unsafe, or speculative).

## Disposition Rules

| Disposition | Meaning | Action |
|---|---|---|
| **adapt** | Existing V1 tool has a clear V2 home | Create V2 adapter, register in namespace |
| **merge** | Multiple V1 tools collapse into fewer V2 tools | Design combined schema, retire V1 originals |
| **replace** | V1 logic is rewritten for V2 contracts | New V2 adapter replaces V1 dispatch path |
| **retire** | Dropped entirely — not migrated to V2 | Document rationale, add to deletion manifest |

## Matrix

### 1. Travel & Weather (priority: HIGH)

| V1 Tool | V2 Name | Namespace | Effect | Disposition | Notes |
|---|---|---|---|---|---|
| `find_rv_parks` | `find_campgrounds` | travel | READ | adapt ✅ | Already migrated in PRD 02 |
| `optimize_route` | `optimize_route` | travel | READ | adapt ✅ | Already migrated in PRD 02 |
| `get_weather_forecast` | `get_weather` | travel | READ | merge ✅ | Merged into `get_weather` in PRD 02 |
| `weather_advisor` | — | — | — | retire | Duplicate of `get_weather_forecast`; OpenMeteo already exposed |
| `find_cheap_gas` | `find_cheap_gas` | travel | READ | adapt | Fuel price lookup (NSW FuelCheck) |
| `get_road_conditions` | `get_road_conditions` | travel | READ | adapt | Road hazard/closure check |
| `estimate_travel_time` | `estimate_travel_time` | travel | READ | adapt | RV-aware travel duration |
| `find_attractions` | `find_attractions` | travel | READ | adapt | POI search |
| `suggest_seasonal_route` | — | — | — | merge | Fold into `optimize_route` as seasonal param |
| `find_longstay_parks` | — | — | — | merge | Fold into `find_campgrounds` with long_stay flag |
| `seasonal_weather_check` | — | — | — | merge | Fold into `get_weather` with seasonal param |
| `calculate_gas_cost` | `calculate_gas_cost` | travel | READ | adapt | Trip fuel cost estimator |
| `mapbox_navigator` | — | — | — | retire | Redundant behind individual map services |
| `save_favorite_spot` | — | — | — | drop | Not core to V2 MVP |
| `update_vehicle_fuel_consumption` | — | — | — | merge | Move to profile/vehicle namespace |
| `plan_trip` | `plan_trip` | travel | WRITE | adapt | Requires approval |
| `search_travel_videos` | — | — | — | retire | Low-value, YouTube dependency |

### 2. Finances & Budget (priority: HIGH)

| V1 Tool | V2 Name | Namespace | Effect | Disposition | Notes |
|---|---|---|---|---|---|
| `create_expense` | `add_expense` | money | WRITE | adapt | Requires approval |
| `get_spending_summary` | `get_spending` | money | READ | merge | Combine summaries |
| `analyze_budget` | — | — | — | merge | Into `get_spending` |
| `compare_vs_budget` | — | — | — | merge | Into `get_spending` |
| `predict_end_of_month` | — | — | — | retire | Speculative; remove |
| `find_savings_opportunities` | — | — | — | retire | Low accuracy |
| `update_budget` | `set_budget` | money | WRITE | adapt | Requires approval |
| `track_savings` | — | — | — | retire | ROI tracking not MVP |
| `categorize_transaction` | `categorize_expense` | money | WRITE | adapt | Likely no approval needed |
| `export_budget_report` | — | — | — | retire | Out of scope for V2 |
| `manage_finances` | — | — | — | retire | Mega-tool; split into individual tools |

### 3. Calendar (priority: HIGH)

| V1 Tool | V2 Name | Namespace | Effect | Disposition | Notes |
|---|---|---|---|---|---|
| `get_calendar_events` | `list_calendar_events` | calendar | READ | adapt ✅ | PRD 02 |
| `create_calendar_event` | `create_calendar_event` | calendar | WRITE | adapt ✅ | PRD 04, requires approval |
| `update_calendar_event` | — | calendar | WRITE | merge | Integrate into `create_calendar_event` with optional id |
| `delete_calendar_event` | — | calendar | DELETE | adapt | Requires approval |

### 4. Profile & Account (priority: MEDIUM)

| V1 Tool | V2 Name | Namespace | Effect | Disposition | Notes |
|---|---|---|---|---|---|
| `load_user_profile` | `load_profile` | profile | READ | adapt ✅ | PRD 02 |
| `update_profile` | `update_profile` | profile | WRITE | adapt | Requires approval |
| `get_user_stats` | — | — | — | merge | Into `load_profile` |
| `update_settings` | `update_settings` | profile | WRITE | adapt | |
| `manage_privacy` | — | — | — | merge | Into `update_settings` |
| `create_vehicle` | `add_vehicle` | profile | WRITE | adapt | Requires approval |
| `update_vehicle_fuel_consumption` | — | profile | WRITE | merge | Into vehicle edit |
| `export_data` | — | — | — | retire | GDPR handled separately |

### 5. Social & Community (priority: MEDIUM)

| V1 Tool | V2 Name | Namespace | Effect | Disposition | Notes |
|---|---|---|---|---|---|
| `get_feed` | `get_feed` | community | READ | adapt | |
| `create_post` | `create_post` | community | WRITE | adapt | |
| `like_post` | `like_post` | community | WRITE | adapt | |
| `comment_on_post` | `comment_on_post` | community | WRITE | adapt | |
| `find_nearby_rvers` | `find_nearby_rvers` | community | READ | adapt | |
| `message_friend` | `send_message` | community | WRITE | adapt | |
| `follow_user` | `follow_user` | community | WRITE | adapt | |
| `search_posts` | `search_posts` | community | READ | adapt | |
| `create_event` | `create_community_event` | community | WRITE | adapt | |
| `share_location` | — | — | — | retire | Privacy concerns |
| `submit_community_tip` | — | — | — | merge | Into `create_post` |
| `search_tips` | — | — | — | merge | Into `search_posts` |
| `search_knowledge` (community) | — | — | — | merge | Into `search_posts` |

### 6. Fuel Log (priority: MEDIUM)

| V1 Tool | V2 Name | Namespace | Effect | Disposition | Notes |
|---|---|---|---|---|---|
| `get_fuel_log` | `list_fuel_entries` | vehicle | READ | adapt | |
| `get_fuel_stats` | — | — | — | merge | Into `list_fuel_entries` |
| `add_fuel_entry` | `add_fuel_entry` | vehicle | WRITE | adapt | |
| `update_fuel_entry` | — | — | — | merge | Into `add_fuel_entry` |
| `delete_fuel_entry` | — | vehicle | DELETE | adapt | |
| `scan_fuel_receipt_with_confidence` | — | — | — | retire | Receipt OCR deferred |

### 7. Maintenance (priority: MEDIUM)

| V1 Tool | V2 Name | Namespace | Effect | Disposition | Notes |
|---|---|---|---|---|---|
| `get_maintenance_schedule` | `get_maintenance` | vehicle | READ | merge | Combine queries |
| `get_maintenance_history` | — | — | — | merge | Into `get_maintenance` |
| `create_maintenance_record` | `add_maintenance` | vehicle | WRITE | adapt | |
| `update_maintenance_record` | — | — | — | merge | Into `add_maintenance` |
| `delete_maintenance_record` | — | vehicle | DELETE | adapt | |

### 8. Transition (priority: LOW)

| V1 Tool | V2 Name | Namespace | Effect | Disposition | Notes |
|---|---|---|---|---|---|
| `get_transition_progress` | — | — | — | retire | Feature not in V2 scope |
| `get_transition_tasks` | — | — | — | retire | |
| `create_transition_task` | — | — | — | retire | |
| `complete_transition_task` | — | — | — | retire | |
| `log_shakedown_trip` | — | — | — | retire | |
| `add_shakedown_issue` | — | — | — | retire | |
| `get_shakedown_summary` | — | — | — | retire | |
| `add_equipment_item` | — | — | — | retire | |
| `mark_equipment_purchased` | — | — | — | retire | |
| `get_equipment_list` | — | — | — | retire | |
| `get_launch_week_status` | — | — | — | retire | |
| `complete_launch_task` | — | — | — | retire | |

### 9. Meals (priority: LOW)

| V1 Tool | V2 Name | Namespace | Effect | Disposition | Notes |
|---|---|---|---|---|---|
| `save_recipe` | — | — | — | retire | Not MVP; recipe_scrapers dependency |
| `search_recipes` | — | — | — | retire | |
| `share_recipe` | — | — | — | retire | |
| `manage_dietary_prefs` | — | — | — | retire | |
| `manage_pantry` | — | — | — | retire | |
| `plan_meals` | — | — | — | retire | |
| `generate_shopping_list` | — | — | — | retire | |

### 10. Shop (priority: LOW)

| V1 Tool | V2 Name | Namespace | Effect | Disposition | Notes |
|---|---|---|---|---|---|
| `search_products` | — | — | — | retire | Affiliate link, not core |
| `get_product_details` | — | — | — | retire | |
| `recommend_products` | — | — | — | retire | |
| `compare_prices` | — | — | — | retire | |

### 11. Admin & Knowledge (priority: SKIP for V2)

| V1 Tool | Disposition | Notes |
|---|---|---|
| `add_knowledge` | skip | Admin-only; not part of V2 runtime |
| `search_knowledge` | skip | V1 remains; not migrated |
| `web_search` | skip | Exists in V1; deferred |
| `enhanced_search` | skip | Financial co-pilot deferred |

### 12. Universal / Browser Tools (priority: SKIP for V2)

| V1 Tool | Disposition | Notes |
|---|---|---|
| `universal_action` | skip | No unrestricted browser automation in V2 |
| `universal_extract` | skip | |
| `universal_browser` | skip | |

### 13. Timer (priority: SKIP)

| V1 Tool | Disposition | Notes |
|---|---|---|
| `set_timer_or_alarm` | skip | Not core to travel assistant |

## Summary

| Domain | Total | Adapt | Merge | Retire | Skip | Already V2 |
|---|---|---|---|---|---|---|
| Travel & Weather | 18 | 6 | 3 | 3 | 0 | 6 |
| Finances & Budget | 11 | 3 | 2 | 5 | 0 | 0 |
| Calendar | 4 | 0 | 1 | 0 | 0 | 3 |
| Profile & Account | 8 | 3 | 2 | 1 | 0 | 2 |
| Social & Community | 13 | 7 | 3 | 1 | 0 | 0 |
| Fuel Log | 6 | 2 | 2 | 1 | 0 | 0 |
| Maintenance | 5 | 1 | 2 | 0 | 0 | 0 |
| Transition | 12 | 0 | 0 | 12 | 0 | 0 |
| Meals | 7 | 0 | 0 | 7 | 0 | 0 |
| Shop | 4 | 0 | 0 | 4 | 0 | 0 |
| Admin/Knowledge | 4 | 0 | 0 | 0 | 4 | 0 |
| Universal/Browser | 3 | 0 | 0 | 0 | 3 | 0 |
| Timer | 1 | 0 | 0 | 0 | 1 | 0 |
| **TOTAL** | **96** | **22** | **15** | **34** | **8** | **11** |

**V2 target: ~37 tools** (22 adapt + 15 merge → ~22 merged V2 tools = 11 already done + ~26 to migrate = 37 total).
