# Quick Start: GPS Location on Trip Planner

**Problem**: No blue dot or green circle showing my position on the map

**Solution**: You need to click the location button first!

---

## Step-by-Step Guide

### Step 1: Find the Location Button

Look in the **top-right corner** of your trip planner map:

```
┌─────────────────────────────────────────┐
│                                 [+]     │  ← Zoom In
│                                 [-]     │  ← Zoom Out
│                                 [⊕]     │  ← LOCATION BUTTON (this one!)
│                                 [⛶]     │  ← Fullscreen
│                                         │
│                                         │
│            YOUR MAP HERE                │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

The location button looks like a **crosshair target** or **compass icon**.

---

### Step 2: Click the Location Button

When you click it for the first time:
1. Browser will ask: **"Allow wheelsandwins.com to access your location?"**
2. Click **"Allow"**

---

### Step 3: See Your Location

After clicking "Allow":
- **Blue dot** appears showing your exact position
- **Green circle** appears showing GPS accuracy
- Map automatically centers on your location

```
              [Legend Below Toolbar]
           🔵 Your Position  |  🟢 GPS Accuracy


                      🟢 ← Green circle (accuracy)
                     / \
                    /   \
                   |  🔵 | ← Blue dot (your position)
                    \   /
                     \ /
                      🟢
```

---

### Step 4: Enable Tracking (Optional)

Click the location button **again** to enable tracking mode:
- Map will follow you as you move
- Blue arrow shows direction of travel
- Perfect for navigation while driving

---

## Troubleshooting

### I don't see the location button
- **Cause**: Browser viewport too small or zoomed
- **Fix**: Zoom out browser window or scroll to see top-right corner

### I clicked but nothing happens
- **Cause**: Location permission denied or blocked
- **Fix**: Check browser location settings:
  - Chrome: Settings > Privacy > Location > Allow
  - Safari: Settings > Websites > Location > Allow
  - Firefox: URL bar lock icon > Location > Allow

### The location is wrong (far from where I am)
- **Cause**: Using desktop computer (no GPS, using WiFi location)
- **Fix**: Use mobile phone/tablet with GPS

### The green circle is very large
- **Cause**: Weak GPS signal (indoors or surrounded by buildings)
- **Fix**: Go outside or near a window, wait 30 seconds

### I allowed location but still no circles
- **Cause**: GPS hardware unavailable
- **Fix**:
  - Mobile: Enable Location Services in device settings
  - Desktop: Try different browser or use mobile device

---

## Quick Test

Open your browser console (F12) and run:

```javascript
// Check if location is available
console.log('Geolocation:', 'geolocation' in navigator ? '✅ Available' : '❌ Not available');

// Check permission
navigator.permissions.query({ name: 'geolocation' }).then(result => {
  console.log('Permission:', result.state);
  // "granted" = allowed
  // "denied" = blocked
  // "prompt" = will ask when you click button
});
```

---

## Still Not Working?

1. **Try on mobile device** (better GPS than desktop)
2. **Try different browser** (Chrome usually works best)
3. **Check device location settings** (iOS Settings > Privacy > Location Services)
4. **Read full technical guide**: `docs/GPS_LOCATION_INDICATORS_TECHNICAL_OVERVIEW.md`

---

**Key Point**: The GPS circles are NOT automatic. You MUST click the location button to see them!
