# PAM Supabase MCP Server Deployment Guide

## 🚀 Production Deployment

### Step 1: Deploy to Render

1. **Create new Web Service** in Render dashboard
2. **Connect Repository**: https://github.com/your-org/wheels-wins-landing-page
3. **Set Root Directory**: `mcp-server`
4. **Configure Build & Start**:
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`

### Step 2: Environment Variables

Set these environment variables in Render:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key

# Optional (with defaults)
PORT=3001
LOG_LEVEL=info
QUERY_TIMEOUT_MS=15000
MAX_REQUESTS_PER_MINUTE=60
RATE_LIMIT_WINDOW_MS=60000
```

### Step 3: Supabase Configuration

Ensure your Supabase project has:

1. **Row Level Security (RLS) enabled** on all tables
2. **Anon key permissions** configured for read-only access
3. **Required tables exist**:
   - `expenses` (user_id, amount, date, category, description)
   - `budgets` (user_id, active, created_at)  
   - `income` (user_id, amount, date)
   - `profiles` (id, user_id)

### Step 4: Test Deployment

Once deployed, test your MCP server:

```bash
# Health check
curl https://your-mcp-server.onrender.com/health

# MCP handshake test
curl -X POST https://your-mcp-server.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}}}'
```

## 🔌 ChatGPT Integration

### Method 1: Deep Research Connector (Recommended)

1. **Open ChatGPT** → Deep Research
2. **Add Custom Connector**:
   - Name: "PAM Financial Data"
   - Type: Remote MCP Server  
   - URL: `https://your-mcp-server.onrender.com`
   - Authentication: None (RLS handles security)

3. **Test Connection**:
   ```
   List available tools from the PAM financial connector
   ```

### Method 2: Direct MCP Client Integration

For direct integration with MCP-compatible clients:

```json
{
  "mcpServers": {
    "pam-supabase": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/server.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

## 🧪 Testing Your Deployment

### 1. Basic Tool Tests

Test each tool with ChatGPT or MCP client:

```javascript
// Test get_expenses
{
  "name": "get_expenses",
  "arguments": {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "since": "2025-01-01", 
    "limit": 10
  }
}

// Test run_named_query
{
  "name": "run_named_query",
  "arguments": {
    "name": "top_spend_categories",
    "params_json": "[\"123e4567-e89b-12d3-a456-426614174000\", \"2025-01-01\", \"2025-01-31\", 5]"
  }
}
```

### 2. Security Tests

Verify security measures:

- ✅ RLS prevents access to other users' data
- ✅ Only SELECT queries are allowed
- ✅ Rate limiting works under load
- ✅ Invalid parameters are rejected
- ✅ SQL injection attempts are blocked

### 3. Performance Tests

Monitor performance metrics:

- Query response times < 5 seconds
- Rate limiting triggers at configured thresholds
- Memory usage remains stable
- Connection pooling works efficiently

## 📊 Monitoring & Maintenance

### Render Dashboard

Monitor your MCP server:

- **Metrics**: CPU, Memory, Response Times
- **Logs**: Request/response patterns, errors
- **Health**: Automatic restart on failures
- **Scaling**: Auto-scale based on load

### Supabase Dashboard

Monitor database performance:

- **Query Performance**: Slow query identification
- **RLS Policies**: Access pattern analysis
- **Usage Metrics**: Request volume and patterns
- **Error Logs**: Database-level errors

### ChatGPT Usage Analytics

Track MCP usage:

- **Tool Call Frequency**: Most used tools
- **Error Patterns**: Common failure modes
- **User Adoption**: Connector usage trends
- **Performance Impact**: Response time analysis

## 🚨 Troubleshooting

### Common Issues

**"Cannot connect to MCP server"**
- Check Render service is running
- Verify environment variables are set
- Test health endpoint manually

**"RLS policy denies access"**
- Verify user_id format is valid UUID
- Check Supabase RLS policies are correct
- Ensure anon key has proper permissions

**"Query timeout"**  
- Increase QUERY_TIMEOUT_MS
- Optimize Supabase queries
- Check database performance

**"Rate limit exceeded"**
- Increase MAX_REQUESTS_PER_MINUTE
- Check for runaway automation
- Monitor usage patterns

### Emergency Procedures

**Service Down**
1. Check Render dashboard for errors
2. Review recent deployments
3. Restart service if needed
4. Check Supabase status

**Data Breach Concerns**
1. Rotate Supabase keys immediately
2. Review RLS policies
3. Check access logs
4. Update security measures

**High Usage/Cost**  
1. Enable rate limiting
2. Optimize query patterns
3. Consider caching layers
4. Review user adoption metrics

## 🔒 Security Best Practices

### Supabase Security

- Use dedicated anon key for MCP server
- Enable RLS on all tables
- Regular security policy reviews
- Monitor access patterns

### Server Security

- Keep dependencies updated
- Use HTTPS only
- Implement proper logging
- Regular security audits

### ChatGPT Integration Security

- Validate all user inputs
- Sanitize query parameters
- Log all tool calls
- Monitor for abuse patterns

## 📈 Scaling Considerations

### Horizontal Scaling

- Load balancer for multiple instances
- Shared rate limiting (Redis)
- Distributed caching
- Connection pooling

### Vertical Scaling

- Increase Render instance size
- Optimize Supabase queries  
- Implement query caching
- Connection optimization

### Cost Optimization

- Monitor Supabase usage
- Optimize query efficiency
- Implement intelligent caching
- Right-size Render instances

## 🔄 Updates & Maintenance

### Regular Updates

- Weekly dependency updates
- Monthly security reviews
- Quarterly performance optimization
- Annual architecture review

### Version Management

- Semantic versioning for releases
- Staged rollouts for major changes
- Rollback procedures documented
- Change log maintenance

---

## 📋 Deployment Checklist

- [ ] Render service created and configured
- [ ] Environment variables set correctly
- [ ] Supabase RLS policies configured
- [ ] Health check endpoint responding
- [ ] All 4 tools tested successfully
- [ ] Security measures verified
- [ ] ChatGPT connector configured
- [ ] Monitoring dashboards set up
- [ ] Documentation updated
- [ ] Team trained on troubleshooting

**🎉 Your PAM Supabase MCP Server is now live and ready for ChatGPT integration!**