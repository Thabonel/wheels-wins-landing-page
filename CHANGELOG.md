# Changelog

All notable changes to the Wheels & Wins project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Per-subfolder `cloud.md` documentation files for better context management
- `PLAN.md` template for structured task planning
- Comprehensive project overview in root `cloud.md`
- Advanced Claude Code workflow guide with explore→plan→review→execute methodology
- `PROMPTS.md` library with battle-tested prompts for common tasks
- `GITHUB_INTEGRATION.md` for autonomous GitHub bot setup
- Instructions for Claude section in root `cloud.md`

### Changed
- Updated `CLAUDE.md` with critical instructions to check documentation first
- Enhanced `CLAUDE.md` with advanced workflow techniques (double escape, agent swarms, validation)

---

## 2025-01-26

### Fixed
- Animation system overhaul - removed problematic page transitions
- WebSocket stability for PAM AI assistant
- Database RLS policy infinite recursion issues
- Environment variable auto-correction for Supabase configuration
- Missing database tables: `affiliate_sales` and `user_wishlists`

### Added
- Serena MCP server integration for semantic code analysis
- Smart environment detection for swapped Supabase variables
- Build-time debugging tools for deployment troubleshooting

### Why Not Revert
- Previous animation system caused visual glitches and poor UX
- Legacy RLS policies had circular dependencies causing database errors
- Manual environment configuration was error-prone in production

---

## 2025-01-22

### Added
- Initial Supabase MCP server configuration
- Database migration for camping enhancements
- Trip templates with 10 Australian routes

### Fixed
- Trip templates query to use correct Supabase array filter syntax
- Trip templates display issue - now shows all configured routes

### Security
- Removed test file with hardcoded Supabase anon key

---

## 2025-01-20

### Added
- Initial project setup with React 18 + Vite
- Mapbox integration for trip planning
- PAM AI assistant with voice capabilities
- Financial management features
- Social networking components
- PWA configuration with offline support

### Infrastructure
- Frontend deployment on Netlify
- Backend deployment on Render
- PostgreSQL database on Supabase
- Redis caching layer
- Multi-engine TTS system

---

## Contributing

When adding entries:
1. Use the current date as the version header
2. Group changes by type: Added, Changed, Deprecated, Removed, Fixed, Security
3. Include the reason for changes and why reverting would be problematic
4. Reference related issue numbers or PR links when applicable