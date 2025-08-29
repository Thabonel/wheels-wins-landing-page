# Asset Restoration Guide

## Manual Fix Instructions

If the script doesn't work, follow these manual steps:

### 1. Fix Asset URLs
Edit `src/utils/publicAssets.ts`:
```typescript
export function getPublicAssetUrl(file: string): string {
  return `https://your-project-id.supabase.co/storage/v1/object/public/public-assets/${file}`;
}
```

### 2. Fix Hero Component
Edit `src/components/Hero.tsx` - ensure the section has NO relative class:
```typescript
<section className="w-full h-screen flex items-center justify-center overflow-hidden">
```

### 3. Verify Header Logic
Check `src/components/header/HeaderContainer.tsx` has this logic:
```typescript
const baseClass =
  isHomePage && !isScrolled
    ? "bg-transparent"
    : isHomePage && isScrolled
    ? "bg-white/90 backdrop-blur-sm shadow-sm"
    : "bg-white shadow-sm";
```

### 4. Check Layout Component
Ensure `src/components/Layout.tsx` renders Header without wrapper:
```typescript
<Header />
```
NOT:
```typescript
<header className="bg-white shadow-sm border-b px-6 py-4">
  <Header />
</header>
```

## Your Asset Configuration

- **Hero Image**: WheelsnadwinsHero.jpg
- **Logo**: wheels and wins Logo alpha.png
- **Supabase Base URL**: https://your-project-id.supabase.co/storage/v1/object/public/public-assets/

## Prevention Strategy

- Always commit changes before switching branches
- Keep the restoration script in your root directory
- Monitor these critical files for unexpected changes:
  - `src/utils/publicAssets.ts`
  - `src/components/Hero.tsx`
  - `src/components/Layout.tsx`
  - `src/components/header/Header.tsx`

## Git Recovery Commands

```bash
# Check what files changed
git status

# See specific differences  
git diff src/components/Hero.tsx

# Restore from backup branch
git checkout main-backup -- src/components/Hero.tsx
git checkout main-backup -- src/utils/publicAssets.ts

# Commit the restoration
git add . && git commit -m "Restore original hero and assets"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Header not transparent | Check Layout.tsx for wrapper elements |
| Hero image not loading | Verify publicAssets.ts points to Supabase |
| Wrong image showing | Check browser cache, hard refresh (Ctrl+F5) |
| Assets loading from local files | Run restoration script |

## File Monitoring

Set up alerts or regularly check these files for changes:

- Watch for Unsplash URLs appearing in components
- Monitor publicAssets.ts for local file references
- Check Hero component for relative positioning
- Verify Layout component header structure