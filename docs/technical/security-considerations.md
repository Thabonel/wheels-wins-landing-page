# Security Considerations

Comprehensive security documentation covering authentication, authorization, data protection, and security best practices for the PAM system.

## Security Architecture Overview

PAM implements a defense-in-depth security strategy with multiple layers:
- **Network Security**: HTTPS, CORS, Rate Limiting
- **Authentication**: JWT tokens, OAuth, 2FA
- **Authorization**: Role-based access control, Row Level Security
- **Data Protection**: Encryption at rest and in transit
- **Application Security**: Input validation, SQL injection prevention
- **Monitoring**: Audit logging, intrusion detection

## Authentication & Authorization

### JWT Token Security

#### Token Structure
```typescript
interface JWTPayload {
  sub: string;      // User ID
  email: string;    // User email
  role: string;     // User role
  iat: number;      // Issued at
  exp: number;      // Expiration
  jti: string;      // JWT ID for revocation
}
```

#### Token Security Best Practices
```typescript
class JWTService {
  private readonly SECRET_KEY: string;
  private readonly ALGORITHM = 'HS256';
  private readonly EXPIRY = '15m'; // Short-lived access tokens
  private readonly REFRESH_EXPIRY = '7d';

  generateTokens(user: User): TokenPair {
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'access'
      },
      this.SECRET_KEY,
      {
        expiresIn: this.EXPIRY,
        algorithm: this.ALGORITHM,
        jwtid: generateJTI()
      }
    );

    const refreshToken = jwt.sign(
      {
        sub: user.id,
        type: 'refresh'
      },
      this.SECRET_KEY,
      {
        expiresIn: this.REFRESH_EXPIRY,
        algorithm: this.ALGORITHM,
        jwtid: generateJTI()
      }
    );

    return { accessToken, refreshToken };
  }

  verifyToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, this.SECRET_KEY) as JWTPayload;
      
      // Check if token is revoked
      if (this.isTokenRevoked(payload.jti)) {
        throw new Error('Token has been revoked');
      }

      return payload;
    } catch (error) {
      throw new AuthenticationError('Invalid token');
    }
  }

  revokeToken(jti: string): void {
    // Add to revocation list (Redis/Database)
    this.revokedTokens.add(jti);
  }
}
```

### Multi-Factor Authentication

#### TOTP Implementation
```typescript
class TwoFactorAuth {
  private readonly ISSUER = 'PAM';

  generateSecret(userEmail: string): TwoFactorSecret {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: this.ISSUER,
      length: 32
    });

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url,
      backupCodes: this.generateBackupCodes()
    };
  }

  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1 // Allow 30-second window
    });
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
  }
}
```

#### SMS-based 2FA
```typescript
class SMSTwoFactor {
  private twilioService: TwilioAdapter;
  private codeStore: Map<string, CodeData> = new Map();

  async sendCode(phoneNumber: string): Promise<void> {
    const code = this.generateSecureCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store code temporarily
    this.codeStore.set(phoneNumber, {
      code: await this.hashCode(code),
      expiresAt,
      attempts: 0
    });

    // Send SMS
    await this.twilioService.sendSMS(
      phoneNumber,
      `Your PAM verification code is: ${code}. Valid for 10 minutes.`
    );
  }

  async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
    const storedData = this.codeStore.get(phoneNumber);
    
    if (!storedData || storedData.expiresAt < new Date()) {
      return false;
    }

    // Rate limiting
    if (storedData.attempts >= 3) {
      this.codeStore.delete(phoneNumber);
      throw new TooManyAttemptsError();
    }

    storedData.attempts++;

    const isValid = await this.verifyHash(code, storedData.code);
    
    if (isValid) {
      this.codeStore.delete(phoneNumber);
    }

    return isValid;
  }

  private generateSecureCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  private async hashCode(code: string): Promise<string> {
    return await bcrypt.hash(code, 10);
  }
}
```

## Data Protection

### Encryption at Rest

#### Sensitive Data Encryption
```typescript
class DataEncryption {
  private readonly ENCRYPTION_KEY: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm';

  constructor(key: string) {
    this.ENCRYPTION_KEY = crypto.createHash('sha256')
      .update(key)
      .digest();
  }

  encrypt(data: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.ALGORITHM, this.ENCRYPTION_KEY);
    cipher.setAAD(Buffer.from('PAM-DATA'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData: EncryptedData): string {
    const decipher = crypto.createDecipher(this.ALGORITHM, this.ENCRYPTION_KEY);
    decipher.setAAD(Buffer.from('PAM-DATA'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

#### Database Field Encryption
```sql
-- Encrypted sensitive fields
CREATE TABLE encrypted_user_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    encrypted_ssn TEXT, -- Encrypted social security number
    encrypted_bank_account TEXT, -- Encrypted bank details
    encryption_key_id TEXT NOT NULL, -- Key rotation support
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to encrypt data before storage
CREATE OR REPLACE FUNCTION encrypt_sensitive_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Encrypt sensitive fields using application-level encryption
    -- This is handled by the application layer, not directly in SQL
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Data Classification

#### Sensitivity Levels
```typescript
enum DataSensitivity {
  PUBLIC = 'public',           // No encryption needed
  INTERNAL = 'internal',       // Basic encryption
  CONFIDENTIAL = 'confidential', // Strong encryption + access controls
  RESTRICTED = 'restricted'    // Strongest encryption + audit logging
}

interface DataClassification {
  sensitivity: DataSensitivity;
  retentionPeriod: number; // days
  encryptionRequired: boolean;
  auditRequired: boolean;
  accessControls: string[];
}

const DATA_CLASSIFICATIONS: Record<string, DataClassification> = {
  'user.email': {
    sensitivity: DataSensitivity.INTERNAL,
    retentionPeriod: 2555, // 7 years
    encryptionRequired: true,
    auditRequired: true,
    accessControls: ['owner', 'admin']
  },
  'financial.account_number': {
    sensitivity: DataSensitivity.RESTRICTED,
    retentionPeriod: 2555,
    encryptionRequired: true,
    auditRequired: true,
    accessControls: ['owner']
  },
  'social.post_content': {
    sensitivity: DataSensitivity.INTERNAL,
    retentionPeriod: 365,
    encryptionRequired: false,
    auditRequired: false,
    accessControls: ['owner', 'group_members']
  }
};
```

## Input Validation & Sanitization

### Request Validation
```typescript
class InputValidator {
  private schemas: Map<string, ValidationSchema> = new Map();

  validateRequest(endpoint: string, data: any): ValidationResult {
    const schema = this.schemas.get(endpoint);
    if (!schema) {
      throw new ValidationError('No validation schema found');
    }

    const result = schema.validate(data);
    
    if (!result.isValid) {
      throw new ValidationError('Invalid input', result.errors);
    }

    // Sanitize input
    return {
      ...result,
      data: this.sanitizeInput(result.data)
    };
  }

  private sanitizeInput(data: any): any {
    if (typeof data === 'string') {
      // Prevent XSS
      data = this.escapeHtml(data);
      // Prevent SQL injection (additional layer)
      data = this.escapeSql(data);
    } else if (Array.isArray(data)) {
      data = data.map(item => this.sanitizeInput(item));
    } else if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        data[key] = this.sanitizeInput(data[key]);
      }
    }

    return data;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
```

### Expense Validation Schema
```typescript
const expenseValidationSchema = {
  amount: {
    type: 'number',
    min: 0.01,
    max: 1000000,
    required: true
  },
  description: {
    type: 'string',
    minLength: 1,
    maxLength: 500,
    pattern: /^[a-zA-Z0-9\s\-.,!?]+$/,
    required: true
  },
  category: {
    type: 'string',
    enum: ['groceries', 'dining', 'transportation', 'entertainment', 'utilities'],
    required: true
  },
  date: {
    type: 'date',
    min: new Date('2020-01-01'),
    max: new Date(),
    required: true
  }
};
```

## SQL Injection Prevention

### Parameterized Queries
```typescript
class SecureDatabase {
  private db: DatabaseConnection;

  async getUserExpenses(userId: string, filters: ExpenseFilters): Promise<Expense[]> {
    // Use parameterized queries - NEVER string concatenation
    const query = `
      SELECT id, amount, description, category, expense_date
      FROM expenses 
      WHERE user_id = $1
        AND expense_date BETWEEN $2 AND $3
        AND category = ANY($4)
      ORDER BY expense_date DESC
      LIMIT $5
    `;

    const params = [
      userId,
      filters.startDate,
      filters.endDate,
      filters.categories,
      filters.limit || 50
    ];

    return await this.db.query(query, params);
  }

  // Query builder with automatic parameterization
  buildSecureQuery(table: string, conditions: QueryConditions): QueryResult {
    const params: any[] = [];
    const whereClauses: string[] = [];
    
    let paramIndex = 1;
    for (const [field, value] of Object.entries(conditions)) {
      // Validate field name against whitelist
      if (!this.isValidFieldName(table, field)) {
        throw new SecurityError(`Invalid field name: ${field}`);
      }
      
      whereClauses.push(`${field} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }

    const query = `SELECT * FROM ${table} WHERE ${whereClauses.join(' AND ')}`;
    
    return { query, params };
  }
}
```

### Row Level Security (RLS)
```sql
-- Comprehensive RLS policies

-- Users can only access their own data
CREATE POLICY "Users access own profiles" ON profiles
    FOR ALL USING (auth.uid() = id);

-- Expenses are private to users
CREATE POLICY "Users manage own expenses" ON expenses
    FOR ALL USING (auth.uid() = user_id);

-- Budgets are private to users
CREATE POLICY "Users manage own budgets" ON budgets
    FOR ALL USING (auth.uid() = user_id);

-- Social posts follow group membership rules
CREATE POLICY "Users see posts in joined groups" ON posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm
            WHERE gm.group_id = posts.group_id
            AND gm.user_id = auth.uid()
            AND gm.is_active = TRUE
        )
    );

-- Admin users can access all data (with audit logging)
CREATE POLICY "Admins access all data" ON profiles
    FOR ALL TO admin_role
    USING (TRUE);

-- Function to check admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Network Security

### HTTPS and Certificate Management
```typescript
class SecurityHeaders {
  static getSecurityHeaders(): HeadersInit {
    return {
      // Force HTTPS
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      
      // Prevent clickjacking
      'X-Frame-Options': 'DENY',
      
      // XSS protection
      'X-XSS-Protection': '1; mode=block',
      
      // Content type sniffing protection
      'X-Content-Type-Options': 'nosniff',
      
      // Referrer policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://trusted-cdn.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://api.pam.com wss://realtime.pam.com",
        "font-src 'self' https://fonts.gstatic.com"
      ].join('; '),
      
      // Feature policy
      'Permissions-Policy': [
        'geolocation=(self)',
        'camera=()',
        'microphone=()',
        'payment=(self)'
      ].join(', ')
    };
  }
}
```

### CORS Configuration
```typescript
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://pam.com',
      'https://www.pam.com',
      'https://app.pam.com'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization'
  ],
  maxAge: 86400 // 24 hours
};
```

### Rate Limiting
```typescript
class RateLimiter {
  private redis: Redis;
  private limiters: Map<string, RateLimitConfig> = new Map();

  constructor() {
    this.setupLimiters();
  }

  private setupLimiters(): void {
    // Different limits for different endpoints
    this.limiters.set('/api/auth/login', {
      requests: 5,
      window: 15 * 60 * 1000, // 15 minutes
      blockDuration: 30 * 60 * 1000 // 30 minutes
    });

    this.limiters.set('/api/chat/*', {
      requests: 60,
      window: 60 * 1000, // 1 minute
      blockDuration: 5 * 60 * 1000 // 5 minutes
    });

    this.limiters.set('/api/expenses', {
      requests: 100,
      window: 60 * 1000, // 1 minute
      blockDuration: 60 * 1000 // 1 minute
    });
  }

  async checkLimit(
    key: string,
    endpoint: string,
    ip: string
  ): Promise<RateLimitResult> {
    const config = this.getLimitConfig(endpoint);
    const redisKey = `rate_limit:${key}:${endpoint}:${ip}`;

    const current = await this.redis.incr(redisKey);
    
    if (current === 1) {
      await this.redis.expire(redisKey, Math.ceil(config.window / 1000));
    }

    const isBlocked = current > config.requests;
    
    if (isBlocked) {
      // Extend block duration
      await this.redis.expire(redisKey, Math.ceil(config.blockDuration / 1000));
    }

    return {
      allowed: !isBlocked,
      remaining: Math.max(0, config.requests - current),
      resetTime: new Date(Date.now() + config.window)
    };
  }
}
```

## Security Monitoring & Logging

### Audit Logging
```typescript
class SecurityAuditLogger {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('security-audit');
  }

  logAuthEvent(event: AuthEvent): void {
    this.logger.info('Authentication event', {
      event_type: event.type,
      user_id: event.userId,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      success: event.success,
      failure_reason: event.failureReason,
      timestamp: new Date().toISOString(),
      session_id: event.sessionId
    });
  }

  logDataAccess(access: DataAccessEvent): void {
    this.logger.info('Data access event', {
      user_id: access.userId,
      resource: access.resource,
      action: access.action,
      ip_address: access.ipAddress,
      timestamp: new Date().toISOString(),
      success: access.success,
      data_classification: access.dataClassification
    });
  }

  logSecurityIncident(incident: SecurityIncident): void {
    this.logger.error('Security incident', {
      incident_type: incident.type,
      severity: incident.severity,
      description: incident.description,
      user_id: incident.userId,
      ip_address: incident.ipAddress,
      timestamp: new Date().toISOString(),
      response_taken: incident.response
    });
  }
}
```

### Intrusion Detection
```typescript
class IntrusionDetection {
  private alertThresholds = {
    failedLogins: { count: 5, window: 15 * 60 * 1000 }, // 5 in 15 min
    suspiciousIPs: { count: 10, window: 60 * 60 * 1000 }, // 10 in 1 hour
    dataExfiltration: { size: 10 * 1024 * 1024 } // 10MB
  };

  async detectAnomalies(event: SecurityEvent): Promise<ThreatLevel> {
    const threats: ThreatDetection[] = [];

    // Check for brute force attacks
    if (event.type === 'failed_login') {
      const recentFailures = await this.getRecentFailedLogins(event.ipAddress);
      if (recentFailures >= this.alertThresholds.failedLogins.count) {
        threats.push({
          type: 'brute_force',
          severity: 'high',
          description: 'Multiple failed login attempts detected'
        });
      }
    }

    // Check for suspicious data access patterns
    if (event.type === 'data_access') {
      const accessPattern = await this.analyzeAccessPattern(event.userId);
      if (this.isSuspiciousPattern(accessPattern)) {
        threats.push({
          type: 'suspicious_access',
          severity: 'medium',
          description: 'Unusual data access pattern detected'
        });
      }
    }

    // Automated response
    if (threats.length > 0) {
      await this.respondToThreats(threats, event);
    }

    return this.calculateThreatLevel(threats);
  }

  private async respondToThreats(
    threats: ThreatDetection[],
    event: SecurityEvent
  ): Promise<void> {
    for (const threat of threats) {
      switch (threat.severity) {
        case 'high':
          // Immediate action: block IP, lock account
          await this.blockIP(event.ipAddress);
          await this.lockAccount(event.userId);
          await this.notifySecurityTeam(threat);
          break;
          
        case 'medium':
          // Elevated monitoring, require additional auth
          await this.requireStepUpAuth(event.userId);
          await this.increaseMonitoring(event.userId);
          break;
          
        case 'low':
          // Log and monitor
          await this.logSecurityEvent(threat);
          break;
      }
    }
  }
}
```

## Compliance & Privacy

### GDPR Compliance
```typescript
class GDPRCompliance {
  async handleDataRequest(request: DataRequest): Promise<DataResponse> {
    switch (request.type) {
      case 'access':
        return await this.exportUserData(request.userId);
        
      case 'rectification':
        return await this.updateUserData(request.userId, request.corrections);
        
      case 'erasure':
        return await this.deleteUserData(request.userId);
        
      case 'portability':
        return await this.exportPortableData(request.userId);
        
      case 'restrict':
        return await this.restrictProcessing(request.userId);
        
      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }
  }

  private async deleteUserData(userId: string): Promise<DataResponse> {
    // Pseudonymize rather than delete to maintain referential integrity
    const anonymizedData = {
      email: `deleted-${crypto.randomUUID()}@example.com`,
      name: 'Deleted User',
      phone: null,
      avatar_url: null,
      // Keep aggregated, anonymized financial data for fraud prevention
      deleted_at: new Date().toISOString()
    };

    await this.database.profiles.update(userId, anonymizedData);
    
    // Delete personal documents and attachments
    await this.storage.deleteUserFiles(userId);
    
    // Log the deletion for compliance
    await this.auditLogger.logDataDeletion(userId);

    return { success: true, message: 'User data deleted successfully' };
  }
}
```

### Data Retention Policies
```typescript
class DataRetentionService {
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();

  constructor() {
    this.setupRetentionPolicies();
  }

  private setupRetentionPolicies(): void {
    this.retentionPolicies.set('audit_logs', {
      retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
      archiveAfter: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
      deleteAfter: 7 * 365 * 24 * 60 * 60 * 1000
    });

    this.retentionPolicies.set('chat_messages', {
      retentionPeriod: 1 * 365 * 24 * 60 * 60 * 1000, // 1 year
      archiveAfter: 90 * 24 * 60 * 60 * 1000, // 90 days
      deleteAfter: 365 * 24 * 60 * 60 * 1000
    });

    this.retentionPolicies.set('session_logs', {
      retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
      deleteAfter: 30 * 24 * 60 * 60 * 1000
    });
  }

  async enforceRetentionPolicies(): Promise<void> {
    for (const [dataType, policy] of this.retentionPolicies) {
      await this.cleanupOldData(dataType, policy);
    }
  }

  private async cleanupOldData(
    dataType: string,
    policy: RetentionPolicy
  ): Promise<void> {
    const cutoffDate = new Date(Date.now() - policy.deleteAfter);
    
    const deletedCount = await this.database.query(
      `DELETE FROM ${dataType} WHERE created_at < $1`,
      [cutoffDate]
    );

    this.logger.info(`Data retention cleanup completed`, {
      dataType,
      deletedRecords: deletedCount,
      cutoffDate
    });
  }
}
```

This comprehensive security framework ensures PAM maintains the highest security standards while providing a seamless user experience.
