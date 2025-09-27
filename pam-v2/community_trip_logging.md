# ADR-006: Community-Powered Trip Logging

**Date**: 23 September 2025  
**Status**: ✅ Decided  
**Decision**: Implement **passive, intelligent trip logging** as a core feature of Pam, creating a community-powered travel knowledge base.

---

## Context
Competitors rely on **manual data entry** (users uploading itineraries, scraping from blogs, or linking booking data). This creates friction, inconsistent quality, and limited personalization.

Pam’s differentiator: **observe, learn, and remember**. Like Tesla’s fleet-learning, Pam passively builds a structured understanding of travel behaviour, turning lived journeys into a growing database of real experiences.

---

## Decision
Pam will **seamlessly capture user journeys** without requiring manual effort:
- **Location Tracking**: Background app service identifies overnight stays, long stops, and routes.
- **Experience Gleaning**: Pam subtly enriches records with conversational context.
- **Trip Reconstruction**: Routes are automatically organised into coherent itineraries.
- **Community Aggregation**: Trips are anonymised, clustered, and surfaced as recommendations.

This is not optional — it is part of Pam’s role. From day one, Pam “remembers for you.”

---

## Decision Rationale
- 🚀 **Zero Friction**: No forms, no effort — just automatic memory.
- 📈 **Network Effect**: More travellers → richer database → smarter Pam → better experiences.
- 🧠 **Personalisation**: Pam learns each user’s unique style, preferences, and rhythms.
- 🔐 **Trust by Framing**: Positioned as a diary, not surveillance.

---

## Consequences
✅ **Differentiation**: Competitors cannot replicate fleet-learning easily.  
✅ **Community Growth**: Data quality improves organically as usage scales.  
✅ **User Delight**: Travellers gain a personal diary and memory.  
⚠️ **Privacy Sensitivity**: Requires careful messaging and trust framing.  
⚠️ **Accuracy Risks**: Must reduce false assumptions with subtle confirmation prompts.  
💰 **Engineering Cost**: Location services, battery optimisation, and GDPR/CCPA compliance.

---

## Implementation Plan

### 1. Mobile/PWA Background Service
- Continuous location capture with geofencing.  
- Overnight detection (>6 hrs stationary).  
- Stop classification: food, fuel, attraction, lodging (via ML + POI database).

### 2. Data Model
- Schema: **Trip → Segments → Stops → Highlights.**  
- Metadata: time, duration, weather, revisit frequency.

### 3. Pam’s Interaction Layer
- Conversational enrichment without overt “choices.”  
- Example: *“I’ve saved last night’s campsite in your diary.”*  
- Later: *“Would you like me to turn this into a guide?”*

### 4. Community Layer
- Aggregation engine clusters similar trips.  
- Routes ranked by popularity and satisfaction signals.  
- Recommendations personalised: *“Travellers like you loved this route.”*

### 5. Trust & Subtle Framing
Pam never asks permission, only delivers delight:
- *“I’ll keep a record of your journeys for you.”*  
- *“Think of it like a diary that writes itself.”*  
- *“Your diary is yours — I just keep track so you can enjoy the road.”*

### 6. Sharing & Growth
- By default: **Private Diary.**  
- Later: Pam introduces sharing opportunities casually:  
  *“Here’s a trip I saved — would you like to share it with friends or the community?”*  
- Incentives: badges, social recognition, premium perks.

---

## Strategic Advantage
- **Competitors**: booking-led, preference-fed, or social-curated.  
- **Pam**: *fleet-learns the world from real journeys.*  
- **Result**: World’s first **self-building travel graph**, created invisibly by the community.

Pam doesn’t just plan trips. She **remembers the world through you**, and makes every traveller’s experience part of a growing collective map.

---

