# 🚀 PUSH TO STAGING DEPLOYMENT CHECKLIST

**CRITICAL**: Complete ALL items before pushing to staging to prevent security incidents!

## 🛡️ **SECURITY REQUIREMENTS** (MANDATORY)

### 🔒 **Secret Prevention Verification**

**Before ANY push to staging, verify:**

#### ✅ **1. No Hardcoded Secrets**
Run the secret scanner:
```bash
gitleaks detect --verbose
```
**MUST return**: `No leaks found` ✅

If secrets found: **STOP** - Fix before continuing!

#### ✅ **2. Pre-commit Hooks Active**
Verify hooks are installed:
```bash
pre-commit run --all-files
```
**MUST pass**: All checks ✅

#### ✅ **3. Forbidden: No Bypass Commits**
**NEVER use**: `git commit --no-verify`
**Team rule**: All commits must pass security hooks

#### ✅ **4. Environment Files Check**
Verify `.gitignore` excludes:
- `*.env*` files
- `docs/maintenance/*.txt` (console logs)
- Any files containing secrets

#### ✅ **5. Console Logs Cleaned**
Check maintenance files for exposed tokens:
```bash
grep -r "pk\.|sk\.|rnd_\|msk-" docs/maintenance/ || echo "✅ Clean"
```

---

## 📋 **DEPLOYMENT CHECKLIST**

### 🔧 **1. Code Quality**
- [ ] All tests passing: `npm test`
- [ ] Type checking: `npm run type-check`
- [ ] Linting: `npm run lint`
- [ ] **Secret scan**: `gitleaks detect` ✅

### 🌐 **2. Staging Environment**
- [ ] Backend URLs point to staging: `wheels-wins-backend-staging.onrender.com`
- [ ] Environment variables configured for staging
- [ ] Database connections to staging environment

### 🔍 **3. Security Verification**
- [ ] **No secrets in commit**: `gitleaks detect --verbose`
- [ ] **Pre-commit hooks passing**: `pre-commit run --all-files`
- [ ] **No bypass flags used**: Check commit messages for `--no-verify`
- [ ] **Console logs cleaned**: No exposed tokens in maintenance files

### 🚦 **4. Final Checks**
- [ ] Commit message follows conventional format
- [ ] All security requirements ✅ above completed
- [ ] Ready for staging deployment

---

## ⚠️ **WHAT TO DO IF SECRETS DETECTED**

1. **STOP** - Do not push
2. Remove secrets from files
3. Use environment variables instead
4. Re-run security checks
5. Only proceed when all checks pass ✅

---

## 🎯 **Why These Security Checks Matter**

Staging is where we catch issues **before** they reach production. Secrets caught here prevent:
- 🔥 Production security breaches
- 💰 Unauthorized API charges
- 🔑 Credential compromise
- 📊 Data exposure

**Remember**: Better to catch security issues in staging than explain them in production! 🛡️