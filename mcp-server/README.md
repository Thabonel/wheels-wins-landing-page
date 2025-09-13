# PAM Supabase MCP Server

## 🚀 Overview
This is a complete Model Context Protocol (MCP) server that enables AI assistants to directly access PAM's financial data through Supabase. Built for ChatGPT Pro's native MCP support.

## 📋 Status: READY FOR FUTURE ACTIVATION
- ✅ Complete implementation with 4 financial tools
- ✅ Security features (rate limiting, SQL validation)
- ✅ Production-ready architecture
- 🔄 Awaiting ChatGPT Pro upgrade for activation

## 💡 Strategic Decision
**Current Status**: PAM now uses Anthropic's native MCP support for superior integration. This server remains ready for future ChatGPT Pro activation when business scales and requires multi-platform AI access.

---

A secure, read-only Model Context Protocol (MCP) server that provides ChatGPT and other AI systems with access to PAM's financial data through Supabase.

## 🚀 Quick Start

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Setup environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Run smoke tests**:
   ```bash
   npm run smoke
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | Required |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Required |
| `PORT` | Server port (HTTP mode) | 3001 |
| `LOG_LEVEL` | Logging level | info |
| `QUERY_TIMEOUT_MS` | Query timeout in milliseconds | 15000 |
| `MAX_REQUESTS_PER_MINUTE` | Rate limit per minute | 60 |

### Security Configuration

- **Read-only access**: Uses Supabase anon key with RLS policies
- **SQL injection protection**: Validates all queries for SELECT-only operations
- **Rate limiting**: Built-in token bucket rate limiter
- **Query validation**: Only predefined analytical queries allowed
- **Parameter sanitization**: JSON parameter validation and type checking

## 🛠️ Available Tools

### 1. `get_expenses`
Retrieve user expenses with optional filtering.

**Parameters**:
- `user_id` (required): User UUID
- `since` (optional): Start date (YYYY-MM-DD)
- `until` (optional): End date (YYYY-MM-DD)  
- `limit` (optional): Max records (default: 100, max: 500)
- `category` (optional): Category filter (partial match)

**Example**:
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "since": "2025-01-01",
  "until": "2025-01-31",
  "limit": 50,
  "category": "fuel"
}
```

### 2. `get_budgets`
Retrieve user budget data.

**Parameters**:
- `user_id` (required): User UUID
- `active_only` (optional): Return only active budgets (default: true)

### 3. `get_income`
Retrieve user income records.

**Parameters**:
- `user_id` (required): User UUID
- `since` (optional): Start date (YYYY-MM-DD)
- `until` (optional): End date (YYYY-MM-DD)
- `limit` (optional): Max records (default: 100, max: 500)

### 4. `run_named_query`
Execute predefined analytical queries.

**Parameters**:
- `name` (required): Query name from allowed list
- `params_json` (required): JSON array of query parameters

**Available Queries**:
- `top_spend_categories`: Top spending categories analysis
- `monthly_burn_rate`: Monthly expense and income trends
- `fuel_cost_trend`: Fuel cost analysis and trends

**Example**:
```json
{
  "name": "top_spend_categories",
  "params_json": "[\"123e4567-e89b-12d3-a456-426614174000\", \"2025-01-01\", \"2025-01-31\", 10]"
}
```

## 📊 Resources

### Available Resources
- `supabase://tables/expenses`: User expense records
- `supabase://tables/budgets`: Budget planning data
- `supabase://tables/income`: Income tracking data
- `supabase://queries/analysis`: Analytical query definitions

## 🚀 Deployment

### Render Deployment

1. **Create new Web Service** in Render dashboard
2. **Connect repository** containing this MCP server
3. **Configure environment variables**:
   - `SUPABASE_URL`: Your production Supabase URL
   - `SUPABASE_ANON_KEY`: Production anon key with proper RLS
4. **Deploy**: Render will automatically build and deploy

### Docker Deployment

```bash
# Build image
docker build -t pam-supabase-mcp .

# Run container
docker run -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=... -p 3001:3001 pam-supabase-mcp
```

## 🔌 ChatGPT Integration

### Setup with ChatGPT Deep Research

1. **Open ChatGPT** → Deep Research
2. **Add Custom Connector**:
   - Type: Remote MCP Server
   - URL: `https://your-mcp-server.onrender.com`
   - Auth: None (uses Supabase RLS for security)

3. **Test connection**:
   ```
   Use the get_expenses tool with user_id=<test-uuid> since=2025-01-01 limit=10
   ```

### MCP Connection Details

```json
{
  "mcp_server_url": "https://pam-supabase-mcp-server.onrender.com",
  "auth": "none",
  "resources": [
    "supabase:tables/budgets", 
    "supabase:tables/expenses", 
    "supabase:tables/income"
  ],
  "tools": [
    "get_expenses",
    "get_budgets", 
    "get_income",
    "run_named_query"
  ]
}
```

## 🛡️ Security Features

### Data Protection
- **Row Level Security (RLS)**: Supabase policies ensure users only access their own data
- **Read-only operations**: No INSERT, UPDATE, or DELETE operations allowed
- **SQL injection prevention**: Query validation and parameter sanitization
- **Rate limiting**: Prevents abuse and resource exhaustion

### Query Safety
- **Whitelist approach**: Only predefined analytical queries allowed
- **Parameter validation**: Type checking and bounds validation
- **Timeout protection**: Prevents long-running queries
- **Error sanitization**: No sensitive data in error messages

## 🧪 Testing

### Smoke Tests
```bash
npm run smoke
```

Tests include:
- ✅ Configuration validation
- ✅ Supabase connection
- ✅ Query validation and loading
- ✅ Parameter validation  
- ✅ SQL injection protection
- ✅ Tool call structure

### Manual Testing
```bash
# Test connection
curl -X POST http://localhost:3001/mcp -d '{"method": "tools/list"}'

# Test tool call
curl -X POST http://localhost:3001/mcp -d '{
  "method": "tools/call",
  "params": {
    "name": "get_expenses", 
    "arguments": {"user_id": "test-uuid", "limit": 5}
  }
}'
```

## 📈 Monitoring

### Logs
- **Structured logging** with Pino
- **Request/response logging** for debugging
- **Error tracking** with context
- **Performance metrics** (query duration, record counts)

### Health Check
- **Endpoint**: `/health` 
- **Checks**: Supabase connectivity
- **Docker**: Built-in health check

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm run smoke`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**Connection fails**:
- Check Supabase URL and anon key
- Verify RLS policies allow access
- Test with `npm run smoke`

**Rate limiting**:
- Reduce request frequency  
- Check rate limit configuration
- Monitor server logs

**Query failures**:
- Verify user_id format (must be UUID)
- Check date format (YYYY-MM-DD)
- Ensure RLS policies permit access

**ChatGPT integration**:
- Verify MCP server URL is accessible
- Check server logs for connection attempts
- Test tools individually first

### Support

For issues related to:
- **MCP Server**: Create issue in this repository
- **PAM Integration**: Contact PAM development team
- **Supabase**: Check Supabase documentation and status page