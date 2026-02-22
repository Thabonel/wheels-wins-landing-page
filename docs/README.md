# Wheels & Wins - Documentation

**Last Updated:** February 22, 2026

This documentation reflects the current state of the Wheels & Wins codebase as of February 2026.

## 📚 Core Documentation

### Essential Reference Files (Always Read First)
- **[PAM_SYSTEM_ARCHITECTURE.md](./PAM_SYSTEM_ARCHITECTURE.md)** - Complete PAM AI assistant overview
- **[DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md)** - Source of truth for all database schemas
- **[PAM_BACKEND_CONTEXT_REFERENCE.md](./PAM_BACKEND_CONTEXT_REFERENCE.md)** - PAM context field mappings
- **[NAMING_CONVENTIONS_MASTER.md](./NAMING_CONVENTIONS_MASTER.md)** - Field naming standards

## 📁 Organized Documentation

### Current Features & Guides
- **[features/](./features/)** - Feature documentation for all app components
- **[reference/](./reference/)** - Technical reference materials
- **[transition/](./transition/)** - Current transition and migration plans

### Implementation & Planning
- **[pam-rebuild-2025/](./pam-rebuild-2025/)** - PAM system rebuild documentation
- **[plans/](./plans/)** - Current development plans and roadmaps
- **[sql-fixes/](./sql-fixes/)** - Database fixes and migrations
- **[decisions/](./decisions/)** - Architectural decision records (ADRs)

### Archive
- **[archive/](./archive/)** - Historical documentation (not tracked in git)
  - Session logs, old deployment fixes, outdated analyses
  - Organized by date and type for historical reference

## 🚨 Critical Rules

1. **Always read core docs before PAM/database work**
2. **DATABASE_SCHEMA_REFERENCE.md is the source of truth** - never assume column names
3. **Update docs immediately when making schema/API changes**
4. **Keep archive separate from current docs**

## 🔄 Documentation Maintenance

- **Core docs**: Updated with major system changes
- **Archive cleanup**: Performed February 22, 2026 (166 outdated docs moved)
- **Next review**: Schedule quarterly or after major releases

## 🏗️ System Architecture

**Stack:** React 18.3 + TypeScript + Vite + Tailwind + Supabase + FastAPI
**AI:** Claude Sonnet 4.5 (primary), GPT-5.1 (fallback)
**Infrastructure:** Netlify (frontend) + Render (backend) + Supabase (database)

## 💡 Quick Start

For development setup and deployment instructions, see:
- [CLAUDE.md](../CLAUDE.md) - Complete development guidelines
- [features/README.md](./features/README.md) - Feature overview
- [pam-rebuild-2025/PAM_FINAL_PLAN.md](./pam-rebuild-2025/PAM_FINAL_PLAN.md) - PAM implementation plan

---

*This documentation structure was established February 22, 2026 to provide a clean, current reflection of the codebase.*