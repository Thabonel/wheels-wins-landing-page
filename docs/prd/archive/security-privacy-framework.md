# Universal Site Access - Security and Privacy Framework PRD

**Document Version:** 1.0
**Created:** February 1, 2026
**Author:** Security Architecture Team
**Status:** Draft

---

## Executive Summary

This PRD defines the comprehensive security and privacy framework for the Universal Site Access (USA) system. The framework ensures that AI-generated code and browser automation operate within strict security boundaries while maintaining user privacy and trust.

### Key Security Objectives

1. Prevent execution of potentially harmful AI-generated code
2. Protect user credentials and sensitive data
3. Enforce permission-based action control
4. Maintain audit trails for all automated actions
5. Enable safe rollback and incident response

### Security Posture

| Aspect | Approach | Confidence |
|--------|----------|------------|
| Code Execution | Sandboxed containers | 99.9% isolation |
| Credential Storage | Zero-knowledge encryption | AES-256-GCM |
| Permission Model | Three-tier approval system | Configurable per user |
| Audit Logging | Immutable event stream | 100% coverage |

---

## 1. Sandboxed Execution Environment

### 1.1 Container Architecture

All AI-generated code executes within isolated Docker containers with restricted capabilities.

**Container Configuration:**
```yaml
# Security-hardened container spec
container:
  name: usa-sandbox-{session_id}
  image: usa-sandbox:latest

  security_context:
    read_only_root_filesystem: true
    run_as_non_root: true
    run_as_user: 65534  # nobody
    capabilities:
      drop:
        - ALL
    seccomp_profile:
      type: RuntimeDefault

  resources:
    limits:
      memory: 512Mi
      cpu: 500m
    requests:
      memory: 256Mi
      cpu: 100m

  network:
    # Only allow outbound to approved domains
    egress_policy: whitelist
    allowed_domains:
      - "*.supabase.co"
      - "api.openai.com"
      - "api.anthropic.com"
```

### 1.2 Code Analysis Pipeline

Before execution, all generated code passes through static analysis.

```python
class CodeSecurityAnalyzer:
    """
    Analyzes generated code for security violations.

    Blocks code containing:
    - Direct system/shell execution patterns
    - Network socket creation outside sandbox
    - File system access outside /tmp
    - Import of restricted modules
    - Environment variable access
    - Subprocess creation
    """

    # Categories of blocked patterns
    BLOCKED_CATEGORIES = [
        "system_execution",      # Shell commands, subprocess
        "network_raw",           # Raw socket access
        "filesystem_escape",     # Access outside sandbox
        "env_access",            # Environment variable reads
        "code_injection",        # eval, exec patterns
        "restricted_imports",    # Dangerous module imports
    ]

    def __init__(self):
        self.ast_analyzer = ASTSecurityChecker()
        self.pattern_matcher = DangerousPatternMatcher()
        self.import_validator = SafeImportValidator()

    def analyze(self, code: str) -> SecurityAnalysisResult:
        """
        Perform comprehensive security analysis.

        Returns:
            SecurityAnalysisResult with approval status and findings
        """
        findings = []

        # AST-based analysis
        ast_findings = self.ast_analyzer.check(code)
        findings.extend(ast_findings)

        # Pattern matching
        pattern_findings = self.pattern_matcher.scan(code)
        findings.extend(pattern_findings)

        # Import validation
        import_findings = self.import_validator.validate(code)
        findings.extend(import_findings)

        return SecurityAnalysisResult(
            approved=len(findings) == 0,
            findings=findings,
            risk_score=self._calculate_risk_score(findings)
        )

    def _calculate_risk_score(self, findings: List[Finding]) -> float:
        """Calculate overall risk score 0.0 - 1.0"""
        if not findings:
            return 0.0

        severity_weights = {
            "critical": 1.0,
            "high": 0.7,
            "medium": 0.4,
            "low": 0.1
        }

        total = sum(
            severity_weights.get(f.severity, 0.5)
            for f in findings
        )

        return min(1.0, total / len(findings))
```

### 1.3 Allowed Operations Whitelist

Only explicitly permitted operations are allowed.

```python
ALLOWED_OPERATIONS = {
    "browser": [
        "navigate",
        "click",
        "type",
        "scroll",
        "screenshot",
        "extract_text",
        "extract_links",
        "fill_form",
        "select_option",
    ],
    "data": [
        "parse_html",
        "parse_json",
        "filter_list",
        "map_values",
        "sort_data",
        "aggregate",
    ],
    "storage": [
        "read_session",
        "write_session",
        "cache_get",
        "cache_set",
    ],
    "network": [
        "fetch_url",  # Through proxy only
        "api_call",   # To approved APIs only
    ],
}
```

---

## 2. Zero-Knowledge Credential Management

### 2.1 Encryption Architecture

User credentials are encrypted client-side and never transmitted in plaintext.

```typescript
interface CredentialEncryption {
  // Key derivation
  masterKey: DerivedKey;  // From user password + device fingerprint

  // Encryption layers
  credentialKey: AES256Key;      // Encrypts individual credentials
  transportKey: AES256Key;       // Encrypts data in transit
  storageKey: AES256Key;         // Encrypts data at rest
}

class ZeroKnowledgeCredentialManager {
  /**
   * Encrypts credentials client-side before any transmission.
   * Server only ever sees encrypted blobs.
   */

  async storeCredential(
    credential: Credential,
    userKey: CryptoKey
  ): Promise<EncryptedCredential> {
    // Generate unique credential key
    const credKey = await this.deriveCredentialKey(
      userKey,
      credential.domain
    );

    // Encrypt credential data
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: this.generateIV() },
      credKey,
      this.encode(credential)
    );

    // Create storage envelope
    return {
      id: this.generateId(),
      domain: credential.domain,
      encryptedData: encrypted,
      keyHint: this.createKeyHint(credKey),
      createdAt: Date.now(),
      expiresAt: this.calculateExpiry(credential),
    };
  }

  async useCredential(
    encryptedCred: EncryptedCredential,
    userKey: CryptoKey,
    action: CredentialAction
  ): Promise<void> {
    // Decrypt in secure memory
    const credential = await this.decryptInMemory(
      encryptedCred,
      userKey
    );

    // Use credential for action
    await this.executeWithCredential(credential, action);

    // Immediately clear from memory
    this.secureWipe(credential);
  }
}
```

### 2.2 Credential Flow

```
User Device                    Server                      Target Site
     |                           |                              |
     |-- Encrypt(cred, userKey) -|                              |
     |                           |                              |
     |-- Store encrypted blob -->|                              |
     |                           |                              |
     |-- Request action -------->|                              |
     |                           |                              |
     |<-- Send encrypted cred ---|                              |
     |                           |                              |
     |-- Decrypt locally         |                              |
     |                           |                              |
     |-- Use in browser session ------------------------------>|
     |                           |                              |
     |-- Wipe from memory        |                              |
```

### 2.3 Credential Policies

```python
class CredentialPolicy:
    """Policies for credential usage"""

    # Maximum credential lifetime
    MAX_CREDENTIAL_AGE = timedelta(days=90)

    # Auto-expire unused credentials
    UNUSED_EXPIRY = timedelta(days=30)

    # Require re-authentication for sensitive actions
    REAUTH_REQUIRED = [
        "payment",
        "password_change",
        "account_deletion",
        "large_purchase",
    ]

    # Never store these credential types
    NEVER_STORE = [
        "credit_card_cvv",
        "social_security",
        "bank_pin",
    ]
```

---

## 3. Three-Tier Permission Model

### 3.1 Permission Tiers

| Tier | Description | Example Actions | User Interaction |
|------|-------------|-----------------|------------------|
| AUTO | Free, read-only, no risk | Browse, search, view prices | None required |
| NOTIFY | Low-cost, reversible | Add to cart, save item, minor updates | Notification sent |
| APPROVAL | High-cost, irreversible | Purchase, booking, account changes | Explicit approval required |

### 3.2 Action Classification

```python
class ActionClassifier:
    """Classifies actions into permission tiers"""

    def classify(self, action: Action) -> PermissionTier:
        # Check cost thresholds
        if action.cost_usd > 50:
            return PermissionTier.APPROVAL

        if action.cost_usd > 0:
            return PermissionTier.NOTIFY

        # Check reversibility
        if not action.is_reversible:
            return PermissionTier.APPROVAL

        # Check action type
        if action.type in self.HIGH_RISK_TYPES:
            return PermissionTier.APPROVAL

        if action.type in self.MEDIUM_RISK_TYPES:
            return PermissionTier.NOTIFY

        return PermissionTier.AUTO

    HIGH_RISK_TYPES = {
        "purchase",
        "booking_confirmed",
        "subscription_create",
        "account_modify",
        "payment_add",
        "password_change",
    }

    MEDIUM_RISK_TYPES = {
        "cart_add",
        "wishlist_add",
        "preference_update",
        "notification_settings",
    }
```

### 3.3 User Preferences

```typescript
interface UserPermissionPreferences {
  // Spending limits
  autoSpendLimit: number;      // USD, default: 0
  notifySpendLimit: number;    // USD, default: 50
  dailySpendLimit: number;     // USD, default: 200
  weeklySpendLimit: number;    // USD, default: 500

  // Action preferences
  requireApprovalFor: string[];  // Action types
  allowAutoFor: string[];        // Action types

  // Domain trust
  trustedDomains: string[];      // Higher auto limits
  blockedDomains: string[];      // No automation allowed

  // Time restrictions
  quietHours: {
    start: string;  // "22:00"
    end: string;    // "08:00"
    blockLevel: "notify" | "approval" | "all";
  };
}
```

### 3.4 Approval Flow

```
Action Request
     |
     v
+----+----+
| Classify |
+----+----+
     |
     +----> AUTO -----> Execute immediately
     |                  Log action
     |
     +----> NOTIFY ---> Execute action
     |                  Send notification
     |                  Log action
     |
     +----> APPROVAL -> Send approval request
                        Wait for response
                        |
                        +---> Approved: Execute + Log
                        |
                        +---> Denied: Cancel + Log
                        |
                        +---> Timeout: Cancel + Log
```

---

## 4. Audit Logging System

### 4.1 Event Schema

```python
@dataclass
class AuditEvent:
    """Immutable audit event record"""

    # Identity
    event_id: UUID
    timestamp: datetime

    # Actor
    user_id: UUID
    session_id: UUID
    device_fingerprint: str
    ip_address: str

    # Action
    action_type: str
    action_details: Dict[str, Any]
    target_domain: str
    target_url: str

    # Classification
    permission_tier: PermissionTier
    risk_score: float

    # Result
    status: Literal["success", "failed", "cancelled", "timeout"]
    error_message: Optional[str]

    # Financial
    cost_usd: Optional[float]
    transaction_id: Optional[str]

    # Metadata
    ai_model_used: str
    code_hash: str  # Hash of generated code
    execution_time_ms: int
```

### 4.2 Audit Storage

```sql
-- Append-only audit table
CREATE TABLE usa_audit_log (
    event_id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    session_id UUID NOT NULL,

    -- Action details
    action_type VARCHAR(100) NOT NULL,
    action_details JSONB NOT NULL,
    target_domain VARCHAR(255),

    -- Classification
    permission_tier VARCHAR(20) NOT NULL,
    risk_score DECIMAL(3,2),

    -- Result
    status VARCHAR(20) NOT NULL,
    error_message TEXT,

    -- Financial
    cost_usd DECIMAL(10,2),

    -- Integrity
    previous_hash VARCHAR(64),  -- Chain integrity
    event_hash VARCHAR(64) NOT NULL,

    -- Partitioning by month for performance
    CONSTRAINT valid_status CHECK (
        status IN ('success', 'failed', 'cancelled', 'timeout')
    )
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE usa_audit_log_2026_02
    PARTITION OF usa_audit_log
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Indexes for common queries
CREATE INDEX idx_audit_user_time
    ON usa_audit_log(user_id, timestamp DESC);
CREATE INDEX idx_audit_domain
    ON usa_audit_log(target_domain, timestamp DESC);
CREATE INDEX idx_audit_status
    ON usa_audit_log(status) WHERE status != 'success';
```

### 4.3 Audit Retention

| Data Type | Retention Period | Archive Location |
|-----------|------------------|------------------|
| Full audit events | 90 days | PostgreSQL |
| Archived events | 2 years | Cold storage (S3) |
| Aggregated metrics | Indefinite | Analytics DB |
| Financial records | 7 years | Compliance archive |

---

## 5. Incident Response

### 5.1 Incident Categories

| Category | Trigger | Response Time | Actions |
|----------|---------|---------------|---------|
| CRITICAL | Security breach, data leak | Immediate | Auto-shutdown, notify team |
| HIGH | Unusual spending, failed auth burst | 5 minutes | Suspend session, alert user |
| MEDIUM | Pattern anomaly, rate limit | 30 minutes | Log, monitor closely |
| LOW | Minor policy violation | 24 hours | Log, include in report |

### 5.2 Automatic Response Actions

```python
class IncidentResponder:
    """Automated incident response system"""

    async def handle_incident(self, incident: Incident):
        match incident.category:
            case "CRITICAL":
                await self.emergency_shutdown(incident)
                await self.notify_security_team(incident)
                await self.preserve_evidence(incident)

            case "HIGH":
                await self.suspend_user_sessions(incident.user_id)
                await self.notify_user(incident)
                await self.create_ticket(incident)

            case "MEDIUM":
                await self.increase_monitoring(incident.user_id)
                await self.log_detailed(incident)

            case "LOW":
                await self.log_incident(incident)

    async def emergency_shutdown(self, incident: Incident):
        """Immediately halt all automation for affected user"""
        # Kill all active sessions
        await self.session_manager.terminate_all(incident.user_id)

        # Revoke all active tokens
        await self.auth_manager.revoke_all_tokens(incident.user_id)

        # Disable automation
        await self.preferences.disable_automation(incident.user_id)

        # Create forensic snapshot
        await self.forensics.capture_state(incident)
```

### 5.3 Rollback Capabilities

```python
class ActionRollback:
    """Undo automation actions when possible"""

    async def rollback(self, action_id: UUID) -> RollbackResult:
        action = await self.get_action(action_id)

        if not action.is_reversible:
            return RollbackResult(
                success=False,
                reason="Action is not reversible"
            )

        # Execute reversal based on action type
        reversal = self.get_reversal_strategy(action.type)
        result = await reversal.execute(action)

        # Log rollback
        await self.audit.log_rollback(action_id, result)

        return result

    REVERSAL_STRATEGIES = {
        "cart_add": RemoveFromCartStrategy,
        "wishlist_add": RemoveFromWishlistStrategy,
        "preference_update": RestorePreviousStrategy,
        "booking_hold": CancelHoldStrategy,
    }
```

---

## 6. Privacy Protections

### 6.1 Data Minimization

```python
class DataMinimizer:
    """Collect only necessary data, minimize retention"""

    # Fields to never store
    NEVER_STORE = {
        "password",
        "credit_card_full",
        "cvv",
        "ssn",
        "bank_account",
    }

    # Fields to mask in logs
    MASK_IN_LOGS = {
        "email": lambda x: x[:3] + "***@" + x.split("@")[1],
        "phone": lambda x: x[:3] + "****" + x[-4:],
        "name": lambda x: x[0] + "***",
    }

    def sanitize_for_storage(self, data: Dict) -> Dict:
        """Remove sensitive fields, mask PII"""
        sanitized = {}
        for key, value in data.items():
            if key in self.NEVER_STORE:
                continue
            if key in self.MASK_IN_LOGS:
                sanitized[key] = self.MASK_IN_LOGS[key](value)
            else:
                sanitized[key] = value
        return sanitized
```

### 6.2 User Control

```typescript
interface UserPrivacyControls {
  // Data access
  viewMyData(): Promise<UserDataExport>;
  deleteMyData(): Promise<DeletionConfirmation>;

  // Consent management
  getConsents(): Promise<ConsentRecord[]>;
  updateConsent(category: string, granted: boolean): Promise<void>;

  // Activity controls
  pauseDataCollection(): Promise<void>;
  resumeDataCollection(): Promise<void>;

  // Export
  requestDataExport(): Promise<ExportJob>;
  downloadExport(jobId: string): Promise<Blob>;
}
```

### 6.3 GDPR/CCPA Compliance

| Requirement | Implementation |
|-------------|----------------|
| Right to Access | Export API, dashboard view |
| Right to Deletion | Cascading delete with audit |
| Right to Portability | Standard JSON export format |
| Consent Management | Granular consent tracking |
| Data Minimization | Collection limits, auto-expiry |
| Purpose Limitation | Strict action scoping |

---

## 7. Implementation Timeline

### Week 1-2: Foundation
- Sandbox container infrastructure
- Basic code analysis pipeline
- Audit logging schema

### Week 3-4: Credential System
- Zero-knowledge encryption
- Credential storage service
- Secure credential usage flow

### Week 5: Permission System
- Three-tier classification
- User preference management
- Approval workflow UI

### Week 6: Monitoring & Response
- Incident detection rules
- Automated response system
- Rollback capabilities

---

## 8. Testing Requirements

### 8.1 Security Test Categories

| Category | Tests | Coverage Target |
|----------|-------|-----------------|
| Sandbox Escape | Container breakout attempts | 100% blocked |
| Code Injection | Dangerous pattern detection | 99.9% detected |
| Credential Leakage | Storage and transmission | 0 plaintext leaks |
| Permission Bypass | Unauthorized action attempts | 100% blocked |
| Audit Integrity | Log tampering attempts | 100% detected |

### 8.2 Penetration Testing

- Annual third-party security audit
- Quarterly automated vulnerability scanning
- Continuous dependency vulnerability monitoring
- Bug bounty program for edge cases

---

## 9. Dependencies

| Component | Technology | Version |
|-----------|------------|---------|
| Container Runtime | Docker / gVisor | Latest stable |
| Encryption | Web Crypto API / libsodium | - |
| Audit Storage | PostgreSQL | 15+ |
| Cold Storage | AWS S3 | - |
| Monitoring | Prometheus + AlertManager | - |

---

## Appendix: Security Checklist

### Pre-Launch
- [ ] All containers run rootless
- [ ] Code analysis pipeline active
- [ ] Credential encryption tested
- [ ] Permission system configured
- [ ] Audit logging verified
- [ ] Incident response tested
- [ ] Privacy controls functional
- [ ] Penetration test passed

### Ongoing
- [ ] Weekly security scan
- [ ] Monthly audit review
- [ ] Quarterly penetration test
- [ ] Annual compliance audit

---

*Document Version 1.0 - February 1, 2026*
