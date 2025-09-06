#!/bin/bash
# Git-Safe Installation Script
# Installs the git-safe corruption prevention system in any Git repository

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly INSTALL_VERSION="1.0.0"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Installation configuration
INSTALL_MODE="local"  # local, global, or auto
SETUP_HOOKS=true
BACKUP_EXISTING=true
VERBOSE=false

print_header() {
    echo -e "${BLUE}=================================${NC}"
    echo -e "${BLUE}    Git-Safe Installation v${INSTALL_VERSION}${NC}"
    echo -e "${BLUE}=================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

usage() {
    cat << EOF
Usage: $0 [OPTIONS] [TARGET_DIR]

Install git-safe corruption prevention system in a Git repository.

OPTIONS:
    -m, --mode MODE      Installation mode: local, global, or auto (default: local)
    -H, --no-hooks       Don't install Git hooks
    -B, --no-backup      Don't backup existing files
    -v, --verbose        Verbose output
    -h, --help           Show this help message

MODES:
    local     Install in target repository's scripts/ directory
    global    Install globally (requires sudo)
    auto      Auto-detect best installation method

EXAMPLES:
    $0                           # Install in current repository
    $0 /path/to/repo            # Install in specific repository
    $0 --mode global            # Install globally for all repositories
    $0 --no-hooks /path/to/repo # Install without Git hooks

EOF
}

check_dependencies() {
    local missing_deps=()
    
    command -v git >/dev/null 2>&1 || missing_deps+=("git")
    command -v flock >/dev/null 2>&1 || missing_deps+=("flock")
    command -v realpath >/dev/null 2>&1 || missing_deps+=("realpath")
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        print_info "Please install the missing dependencies and try again."
        exit 1
    fi
    
    print_success "All dependencies available"
}

detect_git_repo() {
    local target_dir="${1:-$(pwd)}"
    
    if ! cd "$target_dir" 2>/dev/null; then
        print_error "Cannot access directory: $target_dir"
        return 1
    fi
    
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        print_error "Not a Git repository: $target_dir"
        print_info "Please run this script from within a Git repository or specify a path to one."
        return 1
    fi
    
    local git_root
    git_root="$(git rev-parse --show-toplevel)"
    echo "$git_root"
}

backup_existing_files() {
    local install_dir="$1"
    local backup_dir="${install_dir}/backups/pre-install-$(date +%Y%m%d-%H%M%S)"
    
    local files_to_backup=(
        "git-safe"
        "git-safe-config"
        ".gitignore"
    )
    
    local backed_up=false
    
    for file in "${files_to_backup[@]}"; do
        if [[ -f "${install_dir}/${file}" ]]; then
            if [[ ! $backed_up ]]; then
                mkdir -p "$backup_dir"
                backed_up=true
                print_info "Creating backup in: $backup_dir"
            fi
            cp "${install_dir}/${file}" "${backup_dir}/"
            print_success "Backed up existing $file"
        fi
    done
    
    if [[ $backed_up ]]; then
        print_success "Existing files backed up successfully"
    fi
}

install_git_safe_script() {
    local install_dir="$1"
    local git_safe_source="${SCRIPT_DIR}/git-safe"
    local git_safe_target="${install_dir}/git-safe"
    
    if [[ ! -f "$git_safe_source" ]]; then
        print_error "git-safe script not found at: $git_safe_source"
        print_info "Please ensure you're running this installer from the same directory as the git-safe script."
        return 1
    fi
    
    # Create install directory
    mkdir -p "$install_dir"
    
    # Copy git-safe script
    cp "$git_safe_source" "$git_safe_target"
    chmod +x "$git_safe_target"
    
    print_success "Installed git-safe script to: $git_safe_target"
}

create_config_file() {
    local install_dir="$1"
    local config_file="${install_dir}/git-safe-config"
    
    if [[ -f "$config_file" ]] && [[ $BACKUP_EXISTING == true ]]; then
        print_info "Configuration file already exists, keeping existing settings"
        return 0
    fi
    
    cat > "$config_file" << 'EOF'
#!/bin/bash
# Git-Safe Configuration File
# Customize these settings for your repository

# Backup settings
MAX_BACKUPS=5
BACKUP_BEFORE_RISKY_OPS=true
BACKUP_COMPRESSION=true

# Integrity check settings
PRE_OP_INTEGRITY_CHECK=true
POST_OP_INTEGRITY_CHECK=false
FSCK_QUICK_MODE=true

# Logging settings
LOG_LEVEL=INFO  # DEBUG, INFO, WARN, ERROR
LOG_RETENTION_DAYS=30
LOG_GIT_COMMANDS=true

# Lock settings
LOCK_TIMEOUT=300  # 5 minutes
FORCE_LOCK_CLEANUP=false

# Risk assessment
HIGH_RISK_OPERATIONS=(
    "rebase"
    "reset --hard"
    "filter-branch"
    "gc"
    "prune"
)

MEDIUM_RISK_OPERATIONS=(
    "merge"
    "cherry-pick"
    "commit --amend"
    "stash drop"
)

# Auto-recovery settings
AUTO_RECOVERY_ENABLED=true
MAX_RECOVERY_ATTEMPTS=3

# Notification settings
NOTIFY_ON_CORRUPTION=false
NOTIFY_ON_RECOVERY=false

# Hook settings
INSTALL_PRE_COMMIT_HOOK=false
INSTALL_POST_MERGE_HOOK=false
EOF

    print_success "Created configuration file: $config_file"
    print_info "Edit this file to customize git-safe behavior for your repository"
}

install_git_hooks() {
    local repo_root="$1"
    local install_dir="$2"
    local hooks_dir="${repo_root}/.git/hooks"
    
    if [[ $SETUP_HOOKS != true ]]; then
        print_info "Skipping Git hooks installation"
        return 0
    fi
    
    mkdir -p "$hooks_dir"
    
    # Pre-commit hook for integrity check
    local pre_commit_hook="${hooks_dir}/pre-commit"
    if [[ ! -f "$pre_commit_hook" ]] || [[ $BACKUP_EXISTING == true ]]; then
        cat > "$pre_commit_hook" << EOF
#!/bin/bash
# Git-Safe Pre-Commit Hook
# Performs integrity check before commits

GIT_SAFE_SCRIPT="\$(git rev-parse --show-toplevel)/scripts/git-safe"

if [[ -x "\$GIT_SAFE_SCRIPT" ]]; then
    # Run integrity check
    if ! "\$GIT_SAFE_SCRIPT" integrity-check --quiet; then
        echo "Git-Safe: Repository integrity check failed!"
        echo "Run 'scripts/git-safe integrity-check' for details."
        exit 1
    fi
fi
EOF
        chmod +x "$pre_commit_hook"
        print_success "Installed pre-commit hook"
    else
        print_warning "Pre-commit hook already exists, skipping"
    fi
    
    # Post-merge hook for cleanup
    local post_merge_hook="${hooks_dir}/post-merge"
    if [[ ! -f "$post_merge_hook" ]] || [[ $BACKUP_EXISTING == true ]]; then
        cat > "$post_merge_hook" << EOF
#!/bin/bash
# Git-Safe Post-Merge Hook
# Cleanup and maintenance after merges

GIT_SAFE_SCRIPT="\$(git rev-parse --show-toplevel)/scripts/git-safe"

if [[ -x "\$GIT_SAFE_SCRIPT" ]]; then
    # Cleanup old backups
    "\$GIT_SAFE_SCRIPT" cleanup --quiet
    
    # Optional: Run integrity check after merge
    # Uncomment the next line if you want post-merge integrity checks
    # "\$GIT_SAFE_SCRIPT" integrity-check --quiet
fi
EOF
        chmod +x "$post_merge_hook"
        print_success "Installed post-merge hook"
    else
        print_warning "Post-merge hook already exists, skipping"
    fi
}

update_gitignore() {
    local repo_root="$1"
    local gitignore_file="${repo_root}/.gitignore"
    
    local git_safe_ignores=(
        "# Git-Safe generated files"
        "/.git/git-safe/"
        "/scripts/git-safe-config"
        "*.git-safe.backup"
    )
    
    local needs_update=false
    
    for ignore_pattern in "${git_safe_ignores[@]}"; do
        if [[ -f "$gitignore_file" ]]; then
            if ! grep -Fxq "$ignore_pattern" "$gitignore_file"; then
                needs_update=true
                break
            fi
        else
            needs_update=true
            break
        fi
    done
    
    if [[ $needs_update == true ]]; then
        echo "" >> "$gitignore_file"
        printf '%s\n' "${git_safe_ignores[@]}" >> "$gitignore_file"
        print_success "Updated .gitignore with git-safe patterns"
    else
        print_info ".gitignore already contains git-safe patterns"
    fi
}

create_alias_suggestions() {
    local install_dir="$1"
    local aliases_file="${install_dir}/git-safe-aliases.sh"
    
    cat > "$aliases_file" << 'EOF'
#!/bin/bash
# Git-Safe Aliases
# Source this file to add convenient git-safe aliases to your shell
#
# Usage: source scripts/git-safe-aliases.sh

# Get the repository root and scripts directory
GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
GIT_SAFE_SCRIPT="${GIT_ROOT}/scripts/git-safe"

if [[ -x "$GIT_SAFE_SCRIPT" ]]; then
    # Core git-safe aliases
    alias gitsafe='$GIT_SAFE_SCRIPT'
    alias gsafe='$GIT_SAFE_SCRIPT'
    
    # Common operations with git-safe wrapper
    alias gscommit='$GIT_SAFE_SCRIPT git commit'
    alias gsmerge='$GIT_SAFE_SCRIPT git merge'
    alias gsrebase='$GIT_SAFE_SCRIPT git rebase'
    alias gsreset='$GIT_SAFE_SCRIPT git reset'
    
    # Maintenance commands
    alias gscheck='$GIT_SAFE_SCRIPT integrity-check'
    alias gscleanup='$GIT_SAFE_SCRIPT cleanup'
    alias gsbackup='$GIT_SAFE_SCRIPT backup'
    alias gsstatus='$GIT_SAFE_SCRIPT status'
    
    # Recovery commands
    alias gsrecover='$GIT_SAFE_SCRIPT recover'
    alias gsrepair='$GIT_SAFE_SCRIPT repair'
    
    echo "Git-Safe aliases loaded successfully!"
    echo "Try: gsafe --help"
else
    echo "Warning: git-safe script not found at: $GIT_SAFE_SCRIPT"
fi
EOF
    
    print_success "Created alias suggestions: $aliases_file"
    print_info "Source this file to add convenient git-safe aliases: source scripts/git-safe-aliases.sh"
}

verify_installation() {
    local install_dir="$1"
    local repo_root="$2"
    local git_safe_script="${install_dir}/git-safe"
    
    print_info "Verifying installation..."
    
    # Check git-safe script
    if [[ -x "$git_safe_script" ]]; then
        print_success "git-safe script is executable"
    else
        print_error "git-safe script is not executable"
        return 1
    fi
    
    # Test basic functionality
    if "$git_safe_script" --version >/dev/null 2>&1; then
        print_success "git-safe script responds to --version"
    else
        print_warning "git-safe script --version test failed"
    fi
    
    # Check configuration
    local config_file="${install_dir}/git-safe-config"
    if [[ -f "$config_file" ]]; then
        print_success "Configuration file created"
    else
        print_warning "Configuration file missing"
    fi
    
    # Check .gitignore
    local gitignore_file="${repo_root}/.gitignore"
    if [[ -f "$gitignore_file" ]] && grep -q "git-safe" "$gitignore_file"; then
        print_success ".gitignore updated"
    else
        print_warning ".gitignore not updated"
    fi
    
    print_success "Installation verification complete"
}

show_next_steps() {
    local install_dir="$1"
    local repo_root="$2"
    
    echo ""
    print_header
    echo -e "${GREEN}Installation Complete!${NC}"
    echo ""
    
    echo "Next steps:"
    echo "1. Test the installation:"
    echo "   cd '$repo_root'"
    echo "   scripts/git-safe --help"
    echo ""
    
    echo "2. Run an integrity check:"
    echo "   scripts/git-safe integrity-check"
    echo ""
    
    echo "3. Try a safe git operation:"
    echo "   scripts/git-safe git status"
    echo ""
    
    echo "4. Configure for your needs:"
    echo "   edit scripts/git-safe-config"
    echo ""
    
    echo "5. Set up convenient aliases:"
    echo "   source scripts/git-safe-aliases.sh"
    echo ""
    
    print_info "For help and documentation, run: scripts/git-safe --help"
    print_info "Report issues at: https://github.com/your-repo/git-safe/issues"
}

main() {
    # Parse command line arguments
    local target_dir=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -m|--mode)
                INSTALL_MODE="$2"
                shift 2
                ;;
            -H|--no-hooks)
                SETUP_HOOKS=false
                shift
                ;;
            -B|--no-backup)
                BACKUP_EXISTING=false
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            -*)
                print_error "Unknown option: $1"
                usage
                exit 1
                ;;
            *)
                target_dir="$1"
                shift
                ;;
        esac
    done
    
    print_header
    
    # Check dependencies
    check_dependencies
    
    # Detect Git repository
    local repo_root
    if ! repo_root="$(detect_git_repo "${target_dir}")"; then
        exit 1
    fi
    
    print_success "Found Git repository: $repo_root"
    
    # Determine installation directory
    local install_dir
    case "$INSTALL_MODE" in
        local)
            install_dir="${repo_root}/scripts"
            ;;
        global)
            install_dir="/usr/local/bin"
            if [[ $EUID -ne 0 ]]; then
                print_error "Global installation requires root privileges"
                print_info "Run with sudo or use --mode local"
                exit 1
            fi
            ;;
        auto)
            if [[ -w "/usr/local/bin" ]]; then
                install_dir="/usr/local/bin"
                INSTALL_MODE="global"
            else
                install_dir="${repo_root}/scripts"
                INSTALL_MODE="local"
            fi
            ;;
        *)
            print_error "Invalid installation mode: $INSTALL_MODE"
            usage
            exit 1
            ;;
    esac
    
    print_info "Installation mode: $INSTALL_MODE"
    print_info "Installation directory: $install_dir"
    
    # Backup existing files if requested
    if [[ $BACKUP_EXISTING == true ]]; then
        backup_existing_files "$install_dir"
    fi
    
    # Install git-safe script
    install_git_safe_script "$install_dir"
    
    # Create configuration file
    create_config_file "$install_dir"
    
    # Install Git hooks
    install_git_hooks "$repo_root" "$install_dir"
    
    # Update .gitignore
    update_gitignore "$repo_root"
    
    # Create alias suggestions
    create_alias_suggestions "$install_dir"
    
    # Verify installation
    verify_installation "$install_dir" "$repo_root"
    
    # Show next steps
    show_next_steps "$install_dir" "$repo_root"
}

# Only run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi