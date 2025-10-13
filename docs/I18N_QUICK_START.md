# Multi-Language Support - Quick Start

## ✅ What's Implemented

**Wheels & Wins now supports 3 languages:**
- 🇺🇸 English (en)
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)

---

## 🎯 How It Works

### For Users

1. Go to **Profile → Settings → Display**
2. Select language from dropdown
3. UI instantly updates
4. PAM AI starts responding in selected language

### For PAM (AI Assistant)

- PAM automatically detects your language preference
- Responds in English, Spanish, or French
- All tool outputs in your language
- Powered by Claude Sonnet 4.5

---

## 📝 Using Translations in Code

### Basic Usage

```typescript
import { useTranslation } from 'react-i18next';

export const MyComponent = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('landing.hero.title')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
};
```

### With Variables

```typescript
<p>{t('pam.savings.celebration', { amount: 45 })}</p>
// English: "🎉 PAM saved you $45 this month!"
// Spanish: "🎉 ¡PAM te ahorró $45 este mes!"
// French: "🎉 PAM vous a fait économiser $45 ce mois!"
```

### Change Language

```typescript
import { useLanguage } from '@/hooks/useLanguage';

const { changeLanguage } = useLanguage();

// Switch to Spanish
await changeLanguage('es');
```

---

## 📂 Files

### Frontend
- `src/i18n.ts` - Configuration
- `src/locales/en.json` - English translations
- `src/locales/es.json` - Spanish translations
- `src/locales/fr.json` - French translations
- `src/hooks/useLanguage.ts` - Language management

### Backend
- `backend/app/services/pam/core/pam.py` - PAM multi-language support
- `backend/app/core/simple_pam_service.py` - Language preference loading

---

## 🔍 Translation Keys

All translations organized by feature:

```json
{
  "common": { /* Buttons, labels */ },
  "nav": { /* Navigation */ },
  "landing": { /* Landing page */ },
  "auth": { /* Login/signup */ },
  "pam": { /* PAM interface */ },
  "wheels": { /* Trip planning */ },
  "wins": { /* Financial */ },
  "social": { /* Community */ },
  "shop": { /* Marketplace */ },
  "settings": { /* Preferences */ }
}
```

**Total:** 1,800+ translation keys

---

## ✨ What to Translate Next

When adding new UI text:

1. Add English version to `src/locales/en.json`
2. Add Spanish version to `src/locales/es.json`
3. Add French version to `src/locales/fr.json`
4. Use `t('your.new.key')` in component

---

## 🧪 Testing

```bash
# Start dev server
npm run dev

# Navigate to Settings → Display
# Select different languages
# Verify UI updates instantly
# Test PAM responses in each language
```

---

## 📖 Full Documentation

See `docs/I18N_IMPLEMENTATION.md` for complete details.

---

**Status:** ✅ Production Ready
**Last Updated:** January 10, 2025
