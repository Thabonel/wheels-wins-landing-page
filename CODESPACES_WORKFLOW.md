# Safe Codespaces Workflow

## Best Practices to Prevent Git Corruption

### Option 1: Separate Environments (Recommended)
```bash
# Local Development
git checkout -b local/feature-name
# Do all work locally
git push origin local/feature-name

# Codespaces Development  
git checkout -b codespace/feature-name
# Do all work in Codespaces
git push origin codespace/feature-name

# Merge when ready
git checkout main
git merge local/feature-name
git merge codespace/feature-name
```

### Option 2: Sequential Workflow
```bash
# Before switching from local to Codespaces:
git add -A
git commit -m "WIP: Switching to Codespaces"
git push origin current-branch

# In Codespaces:
git pull origin current-branch
# Do work...
git push origin current-branch

# Before switching back to local:
# In Codespaces:
git push origin current-branch

# Locally:
git pull origin current-branch
```

### Option 3: Use Codespaces Web Only
- Use Codespaces ONLY through browser at github.dev
- Never install Codespaces CLI locally
- Keep local and cloud development completely separate

## Warning Signs of Corruption
- Git commands hanging for >5 seconds
- "index.lock" errors repeatedly
- "fatal: bad object" errors
- Can't switch branches
- Git status takes forever

## If Corruption Happens Again
Run the recovery script:
```bash
./fix-codespace-git.sh
```

## Prevention Checklist
- [ ] Never use Codespaces and local simultaneously
- [ ] Always push before switching environments  
- [ ] Pull immediately when switching back
- [ ] Use separate branches for each environment
- [ ] Run `scripts/protect-git.sh` regularly
- [ ] Keep Codespaces sessions short
- [ ] Close Codespaces when done

## Quick Commands
```bash
# Check for problems
git fsck

# Clean up git
git gc --prune=now

# Remove locks
rm -f .git/index.lock

# Kill stuck git processes
pkill -9 -f git
```