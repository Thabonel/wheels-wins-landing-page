# PAM Manual Testing Checklist

**Created:** January 2025
**Purpose:** Manual testing checklist for 37 PAM tools not covered by automated tests
**Status:** Phase 2 of Hybrid Testing Plan

---

## Testing Instructions

### How to Test
1. Open PAM chat interface in staging environment: https://wheels-wins-staging.netlify.app
2. For each tool below, send the "Test Input" message to PAM
3. Verify the response matches the "Expected Output" criteria
4. Mark Pass/Fail in the tracking spreadsheet
5. Document any issues in the Notes column

### Pass Criteria
- ✅ Tool executes without errors
- ✅ Response contains expected data structure
- ✅ Database updated correctly (if applicable)
- ✅ Response time < 5 seconds

### Fail Criteria
- ❌ Tool throws error or exception
- ❌ Response missing required fields
- ❌ Database not updated (if applicable)
- ❌ Response time > 10 seconds

---

## Budget Tools (7 remaining)

### 1. get_spending_summary
**Purpose:** View spending breakdown by category for a time period

**Test Input:**
```
PAM, show my spending summary for January 2025
```

**Expected Output:**
```json
{
  "success": true,
  "summary": {
    "total_spent": 2150.00,
    "period": "January 2025",
    "categories": {
      "fuel": {"amount": 450.00, "percentage": 20.9},
      "food": {"amount": 650.00, "percentage": 30.2},
      "camping": {"amount": 500.00, "percentage": 23.3}
    },
    "daily_average": 69.35
  }
}
```

**Pass Criteria:**
- Returns total_spent as number
- Categories object with breakdown
- Percentages add up to ~100%
- Daily average calculated correctly

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 2. compare_vs_budget
**Purpose:** Compare actual spending vs planned budget

**Test Input:**
```
PAM, compare my spending to my budget for January
```

**Expected Output:**
```json
{
  "success": true,
  "comparison": {
    "total_budget": 3000.00,
    "total_spent": 2150.00,
    "remaining": 850.00,
    "percent_used": 71.7,
    "categories": {
      "fuel": {
        "budget": 500.00,
        "spent": 450.00,
        "remaining": 50.00,
        "status": "on_track"
      }
    },
    "alerts": [
      {
        "category": "food",
        "message": "You're over budget by $50 in food"
      }
    ]
  }
}
```

**Pass Criteria:**
- Returns budget vs actual for each category
- Calculates remaining correctly
- Identifies over-budget categories
- Provides actionable alerts

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 3. predict_end_of_month
**Purpose:** Forecast spending at end of month based on current trends

**Test Input:**
```
PAM, predict my spending for the rest of January
```

**Expected Output:**
```json
{
  "success": true,
  "prediction": {
    "current_date": "2025-01-15",
    "days_remaining": 16,
    "current_spending": 1200.00,
    "projected_total": 2400.00,
    "total_budget": 3000.00,
    "projected_status": "under_budget",
    "projected_remaining": 600.00,
    "confidence": "medium",
    "recommendations": [
      "You're on track to stay under budget",
      "Daily average: $75/day"
    ]
  }
}
```

**Pass Criteria:**
- Calculates projected total based on current rate
- Compares to budget
- Provides confidence level
- Gives actionable recommendations

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 4. find_savings_opportunities
**Purpose:** AI-powered analysis to identify areas to save money

**Test Input:**
```
PAM, where can I save money this month?
```

**Expected Output:**
```json
{
  "success": true,
  "opportunities": [
    {
      "category": "fuel",
      "current_spending": 450.00,
      "potential_savings": 67.50,
      "recommendations": [
        "Use gas finder tool to find cheaper stations",
        "Consider filling up in Nevada (lower gas tax)"
      ],
      "effort": "low"
    },
    {
      "category": "camping",
      "current_spending": 500.00,
      "potential_savings": 150.00,
      "recommendations": [
        "Mix in more boondocking (free camping)",
        "Use national forest sites ($5-15) instead of RV parks"
      ],
      "effort": "medium"
    }
  ],
  "total_potential_savings": 217.50,
  "priority_order": ["camping", "fuel", "food"]
}
```

**Pass Criteria:**
- Identifies at least 2 opportunities
- Calculates potential savings
- Provides specific recommendations
- Prioritizes by impact

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 5. categorize_transaction
**Purpose:** Auto-categorize expenses from bank statements

**Test Input:**
```
PAM, categorize this expense: "Shell Gas Station - $75.50"
```

**Expected Output:**
```json
{
  "success": true,
  "categorization": {
    "original_description": "Shell Gas Station - $75.50",
    "category": "fuel",
    "subcategory": "gas",
    "confidence": 0.95,
    "suggested_tags": ["shell", "gas_station"],
    "amount": 75.50,
    "vendor": "Shell"
  }
}
```

**Pass Criteria:**
- Correctly identifies category
- Extracts amount
- Provides confidence score
- Suggests relevant tags

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 6. export_budget_report
**Purpose:** Generate downloadable financial reports

**Test Input:**
```
PAM, export my budget report for January as PDF
```

**Expected Output:**
```json
{
  "success": true,
  "report": {
    "format": "pdf",
    "download_url": "https://storage.example.com/reports/budget-jan-2025.pdf",
    "expires_at": "2025-01-20T10:00:00Z",
    "includes": [
      "spending_summary",
      "budget_comparison",
      "category_breakdown",
      "charts"
    ],
    "file_size_kb": 234
  }
}
```

**Pass Criteria:**
- Generates downloadable file
- URL is accessible
- Contains all expected sections
- File is valid PDF/CSV

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 7. update_budget
**Purpose:** Modify budget categories and amounts

**Test Input:**
```
PAM, increase my fuel budget to $600 for February
```

**Expected Output:**
```json
{
  "success": true,
  "budget_update": {
    "category": "fuel",
    "old_amount": 500.00,
    "new_amount": 600.00,
    "period": "February 2025",
    "change_percent": 20.0,
    "message": "Fuel budget updated to $600 for February 2025"
  }
}
```

**Pass Criteria:**
- Updates budget in database
- Returns old and new values
- Confirms update with message
- Database reflects change

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

## Trip Planning Tools (7 remaining)

### 8. find_rv_parks
**Purpose:** Search for RV parks and campgrounds with amenity filtering

**Test Input:**
```
PAM, find RV parks near Yellowstone with full hookups and pet-friendly
```

**Expected Output:**
```json
{
  "success": true,
  "rv_parks": [
    {
      "name": "Yellowstone Grizzly RV Park",
      "location": "West Yellowstone, MT",
      "distance_miles": 2.5,
      "amenities": ["full_hookups", "wifi", "pet_friendly", "showers"],
      "rating": 4.5,
      "reviews_count": 342,
      "price_per_night": 65.00,
      "availability": "available",
      "website": "https://example.com"
    }
  ],
  "total_results": 12,
  "filter_applied": {
    "hookups": "full",
    "pets": true,
    "max_distance_miles": 10
  }
}
```

**Pass Criteria:**
- Returns relevant RV parks
- Filters by specified amenities
- Includes pricing and availability
- Shows distance from location

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 9. optimize_route
**Purpose:** Find most cost-effective route with multiple stops

**Test Input:**
```
PAM, optimize route from Phoenix to Seattle through Grand Canyon and Portland
```

**Expected Output:**
```json
{
  "success": true,
  "optimized_route": {
    "origin": "Phoenix, AZ",
    "destination": "Seattle, WA",
    "waypoints": ["Grand Canyon, AZ", "Portland, OR"],
    "total_distance_miles": 1520,
    "estimated_drive_time_hours": 24.5,
    "fuel_cost": 532.00,
    "stops": [
      {
        "order": 1,
        "location": "Grand Canyon, AZ",
        "distance_from_previous": 230,
        "drive_time_hours": 3.5,
        "fuel_cost": 80.50
      }
    ],
    "optimization_savings": {
      "distance_saved_miles": 95,
      "fuel_saved_dollars": 33.25,
      "time_saved_hours": 1.5
    }
  }
}
```

**Pass Criteria:**
- Reorders waypoints for efficiency
- Calculates total costs
- Shows optimization savings
- Includes drive times

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 10. get_road_conditions
**Purpose:** Check road conditions, closures, and hazards

**Test Input:**
```
PAM, check road conditions on I-80 from Salt Lake City to Reno
```

**Expected Output:**
```json
{
  "success": true,
  "road_conditions": {
    "route": "I-80: Salt Lake City, UT to Reno, NV",
    "overall_status": "caution",
    "segments": [
      {
        "section": "Salt Lake City to Wendover",
        "status": "clear",
        "conditions": "dry pavement",
        "speed_limit": 80
      },
      {
        "section": "Donner Pass",
        "status": "hazardous",
        "conditions": "snow, chain requirements",
        "speed_limit": 45,
        "alerts": [
          "Chain requirements in effect",
          "Heavy snow expected 2-6pm"
        ]
      }
    ],
    "closures": [],
    "incidents": [
      {
        "type": "weather",
        "location": "Mile 168",
        "description": "Heavy snow",
        "impact": "high"
      }
    ],
    "recommendation": "Delay travel through Donner Pass until evening"
  }
}
```

**Pass Criteria:**
- Returns current conditions
- Identifies hazards and closures
- Provides route recommendations
- Includes chain requirements

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 11. find_attractions
**Purpose:** Discover points of interest near route or location

**Test Input:**
```
PAM, find attractions near Yellowstone National Park
```

**Expected Output:**
```json
{
  "success": true,
  "attractions": [
    {
      "name": "Old Faithful",
      "type": "geyser",
      "distance_miles": 0,
      "rating": 4.8,
      "description": "Famous geyser erupts every 90 minutes",
      "admission": "included_with_park",
      "hours": "24/7",
      "recommended_duration_hours": 2,
      "images": ["url1", "url2"]
    },
    {
      "name": "Grand Prismatic Spring",
      "type": "hot_spring",
      "distance_miles": 8,
      "rating": 4.9,
      "description": "Largest hot spring in the US",
      "admission": "included_with_park"
    }
  ],
  "total_results": 25,
  "filters_applied": {
    "max_distance_miles": 50,
    "min_rating": 4.0
  }
}
```

**Pass Criteria:**
- Returns relevant attractions
- Includes ratings and descriptions
- Shows distance from location
- Provides practical info (hours, admission)

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 12. estimate_travel_time
**Purpose:** Calculate travel duration with rest stops and breaks

**Test Input:**
```
PAM, estimate travel time from Phoenix to Seattle with breaks every 4 hours
```

**Expected Output:**
```json
{
  "success": true,
  "travel_estimate": {
    "origin": "Phoenix, AZ",
    "destination": "Seattle, WA",
    "total_distance_miles": 1420,
    "driving_time_hours": 22.5,
    "break_time_hours": 6.0,
    "total_time_hours": 28.5,
    "recommended_stops": [
      {
        "order": 1,
        "location": "Flagstaff, AZ",
        "reason": "4-hour break",
        "cumulative_hours": 4
      },
      {
        "order": 2,
        "location": "Salt Lake City, UT",
        "reason": "overnight stop",
        "cumulative_hours": 12
      }
    ],
    "arrival_time": "Day 2, 5:30 PM",
    "trip_duration_days": 2
  }
}
```

**Pass Criteria:**
- Calculates realistic travel time
- Includes rest stops
- Suggests overnight stops
- Accounts for RV driving limits

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 13. save_favorite_spot
**Purpose:** Bookmark locations for future reference

**Test Input:**
```
PAM, save Grand Canyon South Rim Campground as a favorite
```

**Expected Output:**
```json
{
  "success": true,
  "favorite": {
    "id": "fav-uuid",
    "name": "Grand Canyon South Rim Campground",
    "location": {
      "latitude": 36.0544,
      "longitude": -112.1401
    },
    "category": "campground",
    "saved_at": "2025-01-15T10:30:00Z",
    "notes": "",
    "tags": ["campground", "national_park"]
  },
  "message": "Grand Canyon South Rim Campground saved to your favorites"
}
```

**Pass Criteria:**
- Saves location to database
- Returns confirmation
- Allows retrieval later
- Supports notes and tags

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 14. unit_conversion
**Purpose:** Convert between imperial and metric units

**Test Input:**
```
PAM, convert 50 miles to kilometers
```

**Expected Output:**
```json
{
  "success": true,
  "conversion": {
    "from_value": 50,
    "from_unit": "miles",
    "to_value": 80.47,
    "to_unit": "kilometers",
    "conversion_factor": 1.60934,
    "formula": "miles × 1.60934 = kilometers"
  }
}
```

**Pass Criteria:**
- Converts accurately
- Handles multiple unit types (distance, volume, weight)
- Returns conversion factor
- Supports both directions

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

## Social Tools (9 remaining)

### 15. like_post
**Purpose:** Like/react to community posts

**Test Input:**
```
PAM, like the post from John about Yellowstone
```

**Expected Output:**
```json
{
  "success": true,
  "like": {
    "post_id": "post-uuid",
    "user_id": "user-uuid",
    "created_at": "2025-01-15T10:30:00Z",
    "post_author": "John",
    "post_title": "Amazing views at Yellowstone"
  },
  "updated_likes_count": 24,
  "message": "You liked John's post about Yellowstone"
}
```

**Pass Criteria:**
- Creates like in database
- Updates post like count
- Prevents duplicate likes
- Confirms action

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 16. comment_on_post
**Purpose:** Add comments to community posts

**Test Input:**
```
PAM, comment on Sarah's camping post: "Love this spot! We stayed there last summer"
```

**Expected Output:**
```json
{
  "success": true,
  "comment": {
    "id": "comment-uuid",
    "post_id": "post-uuid",
    "user_id": "user-uuid",
    "content": "Love this spot! We stayed there last summer",
    "created_at": "2025-01-15T10:30:00Z",
    "post_author": "Sarah"
  },
  "updated_comments_count": 8,
  "message": "Comment added to Sarah's post"
}
```

**Pass Criteria:**
- Creates comment in database
- Updates post comment count
- Returns comment with timestamp
- Links to correct post

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 17. follow_user
**Purpose:** Follow other RV travelers

**Test Input:**
```
PAM, follow @rvroadwarrior
```

**Expected Output:**
```json
{
  "success": true,
  "follow": {
    "following_id": "user-uuid",
    "followed_id": "target-user-uuid",
    "followed_username": "rvroadwarrior",
    "created_at": "2025-01-15T10:30:00Z"
  },
  "followed_user": {
    "username": "rvroadwarrior",
    "full_name": "Road Warrior",
    "followers_count": 342
  },
  "message": "You're now following @rvroadwarrior"
}
```

**Pass Criteria:**
- Creates follow relationship
- Prevents duplicate follows
- Updates follower count
- Returns user info

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 18. get_feed
**Purpose:** Load social feed with posts from followed users

**Test Input:**
```
PAM, show my social feed
```

**Expected Output:**
```json
{
  "success": true,
  "feed": [
    {
      "post_id": "post-uuid",
      "author": {
        "id": "user-uuid",
        "username": "rvroadwarrior",
        "profile_image": "url"
      },
      "content": "Just arrived at Yosemite! Amazing views",
      "images": ["url1", "url2"],
      "location": "Yosemite National Park",
      "created_at": "2025-01-15T09:00:00Z",
      "likes_count": 45,
      "comments_count": 12,
      "user_liked": false
    }
  ],
  "pagination": {
    "page": 1,
    "total_pages": 5,
    "has_more": true
  }
}
```

**Pass Criteria:**
- Returns posts from followed users
- Sorted by recency
- Includes engagement metrics
- Supports pagination

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 19. search_posts
**Purpose:** Search posts by keyword, location, or tag

**Test Input:**
```
PAM, search posts about Yellowstone camping
```

**Expected Output:**
```json
{
  "success": true,
  "results": [
    {
      "post_id": "post-uuid",
      "author": "John",
      "content": "Best camping spots in Yellowstone...",
      "tags": ["yellowstone", "camping", "rv_parks"],
      "location": "Yellowstone National Park",
      "relevance_score": 0.95,
      "created_at": "2025-01-10T15:00:00Z"
    }
  ],
  "total_results": 23,
  "search_query": "Yellowstone camping",
  "filters_applied": {
    "keywords": ["yellowstone", "camping"]
  }
}
```

**Pass Criteria:**
- Returns relevant posts
- Ranks by relevance
- Supports filters (tags, location)
- Highlights search terms

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 20. get_notifications
**Purpose:** Retrieve user notifications (likes, comments, follows)

**Test Input:**
```
PAM, show my notifications
```

**Expected Output:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif-uuid",
      "type": "like",
      "actor": {
        "id": "user-uuid",
        "username": "sarah_rv",
        "profile_image": "url"
      },
      "action": "liked your post",
      "post_id": "post-uuid",
      "created_at": "2025-01-15T09:30:00Z",
      "read": false
    },
    {
      "type": "comment",
      "actor": {...},
      "action": "commented on your post",
      "comment_text": "Great spot!",
      "read": false
    }
  ],
  "unread_count": 5,
  "pagination": {
    "page": 1,
    "has_more": true
  }
}
```

**Pass Criteria:**
- Returns recent notifications
- Shows unread count
- Includes notification types (like, comment, follow)
- Sorted by recency

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 21. mark_notification_read
**Purpose:** Mark notifications as read

**Test Input:**
```
PAM, mark all notifications as read
```

**Expected Output:**
```json
{
  "success": true,
  "marked_read": {
    "count": 5,
    "notification_ids": ["notif-1", "notif-2", "notif-3", "notif-4", "notif-5"]
  },
  "remaining_unread": 0,
  "message": "5 notifications marked as read"
}
```

**Pass Criteria:**
- Updates notifications in database
- Returns count of marked
- Confirms action
- Reduces unread count

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 22. get_user_posts
**Purpose:** Retrieve posts by specific user

**Test Input:**
```
PAM, show posts by @rvroadwarrior
```

**Expected Output:**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "username": "rvroadwarrior",
    "posts_count": 42
  },
  "posts": [
    {
      "post_id": "post-uuid",
      "content": "Just arrived at Yosemite...",
      "created_at": "2025-01-15T09:00:00Z",
      "likes_count": 45,
      "comments_count": 12
    }
  ],
  "pagination": {
    "page": 1,
    "total_pages": 3,
    "has_more": true
  }
}
```

**Pass Criteria:**
- Returns user's posts only
- Sorted by recency
- Includes engagement metrics
- Supports pagination

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 23. delete_post
**Purpose:** Delete user's own posts

**Test Input:**
```
PAM, delete my post about camping at Yellowstone
```

**Expected Output:**
```json
{
  "success": true,
  "deleted_post": {
    "post_id": "post-uuid",
    "title": "Camping at Yellowstone",
    "deleted_at": "2025-01-15T10:30:00Z"
  },
  "message": "Post deleted successfully",
  "confirmation": "This action cannot be undone"
}
```

**Pass Criteria:**
- Deletes post from database
- Only allows deletion of own posts
- Confirms deletion
- Cascades delete (comments, likes)

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

## Profile Tools (5 remaining)

### 24. update_profile
**Purpose:** Modify user profile information

**Test Input:**
```
PAM, update my profile: add partner name "Sarah" and set region to "Pacific Northwest"
```

**Expected Output:**
```json
{
  "success": true,
  "updated_fields": {
    "partner_name": {
      "old": null,
      "new": "Sarah"
    },
    "region": {
      "old": "Southwest",
      "new": "Pacific Northwest"
    }
  },
  "profile": {
    "id": "user-uuid",
    "full_name": "John Doe",
    "partner_name": "Sarah",
    "region": "Pacific Northwest",
    "updated_at": "2025-01-15T10:30:00Z"
  },
  "message": "Profile updated successfully"
}
```

**Pass Criteria:**
- Updates profile in database
- Returns old and new values
- Validates input (email format, etc.)
- Confirms update

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 25. get_vehicle_info
**Purpose:** Retrieve user's vehicle/RV information

**Test Input:**
```
PAM, what's my current vehicle info?
```

**Expected Output:**
```json
{
  "success": true,
  "vehicle": {
    "type": "Class A Motorhome",
    "make_model": "Newmar Dutch Star",
    "year": 2020,
    "length_ft": 40,
    "weight_lbs": 32000,
    "fuel_type": "diesel",
    "mpg": 8.5,
    "towing": "2019 Jeep Wrangler",
    "features": ["solar_panels", "generator", "satellite"]
  }
}
```

**Pass Criteria:**
- Returns complete vehicle info
- All fields populated
- Correct data types
- Matches profile data

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 26. update_vehicle_settings
**Purpose:** Modify vehicle/RV details

**Test Input:**
```
PAM, update my vehicle: MPG is now 9.2 and I added a solar panel system
```

**Expected Output:**
```json
{
  "success": true,
  "updated_fields": {
    "mpg": {
      "old": 8.5,
      "new": 9.2
    },
    "features": {
      "old": ["generator", "satellite"],
      "new": ["generator", "satellite", "solar_panels"]
    }
  },
  "vehicle": {
    "type": "Class A Motorhome",
    "mpg": 9.2,
    "features": ["generator", "satellite", "solar_panels"]
  },
  "message": "Vehicle settings updated"
}
```

**Pass Criteria:**
- Updates vehicle info
- Validates numeric fields (MPG, weight)
- Returns old/new values
- Confirms update

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 27. get_travel_stats
**Purpose:** View user's travel statistics and achievements

**Test Input:**
```
PAM, show my travel stats
```

**Expected Output:**
```json
{
  "success": true,
  "stats": {
    "total_miles_traveled": 12450,
    "total_trips": 8,
    "states_visited": 15,
    "favorite_state": "Montana",
    "total_spent": 8500.00,
    "average_mpg": 9.1,
    "most_visited_category": "national_parks",
    "longest_trip_miles": 2200,
    "achievements": [
      {
        "name": "Cross Country",
        "description": "Traveled coast to coast",
        "earned_at": "2024-09-15"
      }
    ]
  },
  "time_period": "all_time"
}
```

**Pass Criteria:**
- Calculates stats from database
- Includes achievements/badges
- Accurate calculations
- Provides insights

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 28. set_preferences
**Purpose:** Update user preferences (units, notifications, privacy)

**Test Input:**
```
PAM, change my preferences: use metric units and turn on email notifications
```

**Expected Output:**
```json
{
  "success": true,
  "updated_preferences": {
    "units": {
      "old": "imperial",
      "new": "metric"
    },
    "email_notifications": {
      "old": false,
      "new": true
    }
  },
  "preferences": {
    "units": "metric",
    "email_notifications": true,
    "push_notifications": true,
    "privacy_mode": "friends_only"
  },
  "message": "Preferences updated successfully"
}
```

**Pass Criteria:**
- Updates preferences in database
- Validates preference values
- Returns old/new values
- Applies immediately (units show in metric)

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

## Community Tools (2 remaining)

### 29. get_community_tips
**Purpose:** Retrieve community-submitted travel tips

**Test Input:**
```
PAM, show community tips for camping in Yellowstone
```

**Expected Output:**
```json
{
  "success": true,
  "tips": [
    {
      "id": "tip-uuid",
      "title": "Best time to visit Old Faithful",
      "content": "Visit early morning (6-8am) to avoid crowds...",
      "author": "experienced_rver",
      "category": "camping",
      "location": "Yellowstone National Park",
      "upvotes": 45,
      "created_at": "2024-12-01T10:00:00Z",
      "user_voted": false
    }
  ],
  "total_results": 12,
  "filters_applied": {
    "location": "Yellowstone",
    "category": "camping"
  }
}
```

**Pass Criteria:**
- Returns relevant tips
- Sorted by upvotes/recency
- Shows voting status
- Includes author attribution

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 30. submit_community_tip
**Purpose:** Share travel tips with community

**Test Input:**
```
PAM, submit a tip: "Best boondocking spot near Sedona is at Forest Road 525 - free, amazing views, no hookups"
```

**Expected Output:**
```json
{
  "success": true,
  "tip": {
    "id": "tip-uuid",
    "title": "Best boondocking spot near Sedona",
    "content": "Forest Road 525 - free, amazing views, no hookups",
    "author_id": "user-uuid",
    "category": "boondocking",
    "location": "Sedona, AZ",
    "upvotes": 0,
    "created_at": "2025-01-15T10:30:00Z",
    "status": "published"
  },
  "message": "Tip submitted successfully and is now visible to community"
}
```

**Pass Criteria:**
- Creates tip in database
- Validates content length
- Auto-detects category/location
- Confirms submission

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

## Admin Tools (2 remaining)

### 31. get_pam_analytics
**Purpose:** View PAM usage analytics (admin only)

**Test Input:**
```
PAM, show analytics for the last 30 days
```

**Expected Output:**
```json
{
  "success": true,
  "analytics": {
    "period": "last_30_days",
    "total_conversations": 1245,
    "total_messages": 8932,
    "total_tools_called": 3421,
    "most_used_tools": [
      {"tool": "get_weather_forecast", "count": 456},
      {"tool": "create_expense", "count": 389},
      {"tool": "find_cheap_gas", "count": 312}
    ],
    "average_response_time_ms": 1250,
    "error_rate": 0.02,
    "user_satisfaction": 4.6,
    "cost_metrics": {
      "total_api_cost_usd": 45.23,
      "cost_per_conversation": 0.036
    }
  },
  "requires_admin": true
}
```

**Pass Criteria:**
- Returns comprehensive analytics
- Requires admin role
- Accurate calculations
- Includes cost metrics

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 32. update_admin_knowledge
**Purpose:** Update PAM's knowledge base (admin only)

**Test Input:**
```
PAM, add to knowledge base: "New campground opened at Lake Tahoe - Tahoe Vista RV Resort, full hookups $85/night"
```

**Expected Output:**
```json
{
  "success": true,
  "knowledge_update": {
    "id": "kb-uuid",
    "category": "campgrounds",
    "location": "Lake Tahoe",
    "content": "Tahoe Vista RV Resort - full hookups $85/night",
    "added_by": "admin-user-uuid",
    "created_at": "2025-01-15T10:30:00Z",
    "status": "active"
  },
  "message": "Knowledge base updated. PAM will now recommend this campground.",
  "requires_admin": true
}
```

**Pass Criteria:**
- Adds knowledge to database
- Requires admin role
- Immediately available to PAM
- Confirms addition

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

## Calendar Tools (3 remaining)

### 33. delete_calendar_event
**Purpose:** Delete calendar events

**Test Input:**
```
PAM, delete my maintenance appointment on January 20th
```

**Expected Output:**
```json
{
  "success": true,
  "deleted_event": {
    "event_id": "event-uuid",
    "title": "Maintenance Appointment",
    "start_date": "2025-01-20T10:00:00Z",
    "deleted_at": "2025-01-15T10:30:00Z"
  },
  "message": "Event deleted successfully",
  "confirmation": "This action cannot be undone"
}
```

**Pass Criteria:**
- Deletes event from database
- Only allows deletion of own events
- Confirms deletion
- Returns deleted event details

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 34. get_upcoming_events
**Purpose:** Retrieve upcoming calendar events

**Test Input:**
```
PAM, show my upcoming events for the next 7 days
```

**Expected Output:**
```json
{
  "success": true,
  "events": [
    {
      "event_id": "event-uuid",
      "title": "Oil Change",
      "start_date": "2025-01-17T09:00:00Z",
      "end_date": "2025-01-17T10:00:00Z",
      "event_type": "maintenance",
      "location_name": "Quick Lube",
      "all_day": false,
      "days_until": 2
    },
    {
      "title": "Camping Reservation",
      "start_date": "2025-01-20T14:00:00Z",
      "event_type": "travel",
      "all_day": true,
      "days_until": 5
    }
  ],
  "total_events": 2,
  "period": "next_7_days"
}
```

**Pass Criteria:**
- Returns events within timeframe
- Sorted chronologically
- Shows days until event
- Includes all event details

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 35. search_calendar_events
**Purpose:** Search calendar events by keyword or type

**Test Input:**
```
PAM, search my calendar for maintenance events
```

**Expected Output:**
```json
{
  "success": true,
  "results": [
    {
      "event_id": "event-uuid",
      "title": "Oil Change",
      "event_type": "maintenance",
      "start_date": "2025-01-17T09:00:00Z",
      "location_name": "Quick Lube"
    },
    {
      "title": "Tire Rotation",
      "event_type": "maintenance",
      "start_date": "2025-02-10T14:00:00Z"
    }
  ],
  "total_results": 2,
  "search_query": "maintenance",
  "filters_applied": {
    "event_type": "maintenance"
  }
}
```

**Pass Criteria:**
- Returns matching events
- Supports keyword and type search
- Sorted by date
- Shows search criteria

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

## Miscellaneous Remaining Tools (2)

### 36. send_feedback
**Purpose:** Submit user feedback about PAM

**Test Input:**
```
PAM, send feedback: "Love the gas finder tool! Saved me $20 yesterday"
```

**Expected Output:**
```json
{
  "success": true,
  "feedback": {
    "id": "feedback-uuid",
    "user_id": "user-uuid",
    "content": "Love the gas finder tool! Saved me $20 yesterday",
    "sentiment": "positive",
    "category": "feature_praise",
    "created_at": "2025-01-15T10:30:00Z",
    "status": "received"
  },
  "message": "Thank you for your feedback! We appreciate it."
}
```

**Pass Criteria:**
- Saves feedback to database
- Auto-detects sentiment
- Confirms receipt
- Sends to admin dashboard

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

### 37. report_issue
**Purpose:** Report bugs or problems with PAM

**Test Input:**
```
PAM, report issue: "Weather tool shows wrong temperature for Phoenix - says 50°F but it's 75°F"
```

**Expected Output:**
```json
{
  "success": true,
  "issue_report": {
    "id": "issue-uuid",
    "user_id": "user-uuid",
    "tool_affected": "get_weather_forecast",
    "description": "Weather tool shows wrong temperature for Phoenix - says 50°F but it's 75°F",
    "severity": "medium",
    "status": "reported",
    "created_at": "2025-01-15T10:30:00Z",
    "ticket_number": "ISSUE-1234"
  },
  "message": "Issue reported successfully. Ticket #ISSUE-1234 created.",
  "follow_up": "We'll investigate and update you within 24 hours"
}
```

**Pass Criteria:**
- Creates issue ticket
- Auto-detects affected tool
- Assigns severity
- Returns ticket number

**Test Status:** [ ] Not Tested | [ ] Pass | [ ] Fail
**Tester Notes:** _______________

---

## Testing Summary

**Total Tools to Test:** 37
**Tests Completed:** ___ / 37
**Pass Rate:** ____%
**Critical Failures:** ___
**Blockers Identified:** ___

### Next Steps After Testing
1. Review all failed tests
2. Create bug tickets for critical issues
3. Document patterns in failures
4. Prioritize fixes by severity
5. Retest after fixes deployed

---

**Testing Team:**
- Primary Tester: _______________
- Review Date: _______________
- Environment: Staging (https://wheels-wins-staging.netlify.app)
- Backend Version: _______________
