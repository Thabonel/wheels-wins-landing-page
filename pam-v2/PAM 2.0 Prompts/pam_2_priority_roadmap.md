# 🚦 Pam 2.0 Priority Roadmap

This roadmap defines the exact order to build Pam 2.0, with reasoning for why each track comes first.

---

## **1. Track A – Core Infrastructure (Foundation First)**
- **What:** Repo, staging/prod setup, Supabase schema baseline, Gemini integration.  
- **Why First:** Without this, nothing else can function. All modules depend on infra.  
- **Deliverable:**  
  - FastAPI backend skeleton  
  - Supabase linked + base schema migrated  
  - Gemini API wrapper online in staging  

---

## **2. Track B – Core PAM Modules (Minimum Value Fast)**
- **What:** Trip Planning, Wins (budget/expenses), Maintenance.  
- **Why Second:** These deliver the **core value proposition** of Wheels & Wins — travel, money, safety. They also prove the “Savings Guarantee” model early.  
- **Deliverable:**  
  - Trip logging + route planner (minimal viable version)  
  - Budget tracker linked to Supabase  
  - Maintenance/fuel logs with notifications  

---

## **3. Track D – Voice & Interaction (User Experience Upgrade)**
- **What:** Voice (STT/TTS), PAM UI enhancements, real-time interactions.  
- **Why Third:** Adds delight + accessibility for 55+ audience but is **not critical for MVP**.  
- **Deliverable:**  
  - Voice commands working in staging  
  - Text fallback mode for all voice features  

---

## **4. Track C – Community & Social (Network Effects)**
- **What:** Trip sharing, meetups, social feed.  
- **Why Fourth:** Strong long-term retention, but doesn’t block early adopters from testing Trips + Wins. Build only after core modules are stable.  
- **Deliverable:**  
  - Trip share posts stored in Supabase  
  - Community feed powered by PAM prompts  

---

## **5. Track E – QA & Release (Stability & Scale)**
- **What:** Testing, staging sign-off, production deployment.  
- **Why Last:** Testing is ongoing per track, but final QA ensures clean handoff before release.  
- **Deliverable:**  
  - Test Playbook executed fully  
  - Bugs resolved  
  - Pam 2.0 merged to `main` and live in production  

---

⚡ **Summary Build Order:**  
1. Infrastructure →  
2. Core PAM Modules →  
3. Voice Layer →  
4. Community →  
5. QA & Release  

---

✅ This roadmap ensures:
- **Fastest path to MVP** (Trips + Wins working ASAP).
- **Future-proof modularity** (infra first, modules isolated).
- **User delight after core value proven** (voice + community last).