# Render MCP Server

A Model Context Protocol (MCP) server for automating Render.com deployment management. This server provides tools for monitoring services, managing deployments, updating environment variables, and handling service lifecycle operations.

## Features

🚀 **Deployment Management**
- Trigger new deployments with cache control
- Monitor deployment status and history
- Cancel in-progress deployments

📊 **Service Monitoring**
- List all services with status overview
- Get detailed service information
- Check service health and uptime
- Retrieve and analyze service logs

⚙️ **Environment Management**
- View environment variables (with security masking)
- Update environment variables with validation
- Bulk environment variable operations

🔧 **Service Control**
- Suspend services for cost savings
- Resume suspended services
- Monitor service lifecycle

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Render API key
   ```

3. **Build the server:**
   ```bash
   npm run build
   ```

## Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```bash
# Required: Get from https://dashboard.render.com/account/api-keys
RENDER_API_KEY=your_render_api_key_here

# Optional: Adjust logging level
LOG_LEVEL=info

# Optional: API timeout in milliseconds
RENDER_API_TIMEOUT=30000
```

### Getting a Render API Key

1. Go to [Render Dashboard → Account Settings → API Keys](https://dashboard.render.com/account/api-keys)
2. Click "Create API Key"
3. Give it a descriptive name (e.g., "MCP Server")
4. Copy the generated key to your `.env` file

## Usage

### Running the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build && npm start
```

### Available Tools

The MCP server provides the following tools:

#### Service Management
- `list_services` - List all services with status overview
- `get_service` - Get detailed information about a specific service
- `check_health` - Check service health and deployment status

#### Deployment Operations
- `get_deployments` - Get deployment history for a service
- `trigger_deployment` - Trigger a new deployment
- `cancel_deployment` - Cancel an in-progress deployment

#### Environment Variables
- `get_env_vars` - View environment variables (values masked for security)
- `update_env_vars` - Update environment variables

#### Service Control
- `suspend_service` - Suspend a service to save costs
- `resume_service` - Resume a suspended service

#### Monitoring & Debugging
- `get_logs` - Retrieve and analyze service logs

### Tool Usage Examples

#### List all services
```json
{
  "name": "list_services",
  "arguments": {}
}
```

#### Get service information
```json
{
  "name": "get_service",
  "arguments": {
    "serviceName": "wheels-wins-backend"
  }
}
```

#### Trigger deployment with cache clear
```json
{
  "name": "trigger_deployment",
  "arguments": {
    "serviceName": "wheels-wins-backend",
    "clearCache": true
  }
}
```

#### Update environment variables
```json
{
  "name": "update_env_vars",
  "arguments": {
    "serviceName": "wheels-wins-backend",
    "envVars": [
      {
        "key": "REDIS_URL",
        "value": "redis://red-d1venaur433s73fk12j0:6379"
      }
    ]
  }
}
```

#### Check service health
```json
{
  "name": "check_health",
  "arguments": {
    "serviceName": "wheels-wins-backend",
    "includeLogs": true
  }
}
```

## Integration with Claude Code

To use this MCP server with Claude Code, add it to your MCP configuration:

### Option 1: Local Development
```json
{
  "mcpServers": {
    "render-mcp-server": {
      "command": "node",
      "args": ["/path/to/render-mcp-server/dist/index.js"],
      "env": {
        "RENDER_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Option 2: Using tsx for Development
```json
{
  "mcpServers": {
    "render-mcp-server": {
      "command": "npx",
      "args": ["tsx", "/path/to/render-mcp-server/src/index.ts"],
      "env": {
        "RENDER_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Development

### Project Structure

```
src/
├── index.ts              # Main server entry point
├── render-client.ts      # Render API client with type safety
└── tools/                # MCP tools implementation
    ├── index.ts          # Tool registry
    ├── types.ts          # Common types
    ├── list-services.ts  # Service listing tool
    ├── get-service.ts    # Service details tool
    ├── trigger-deployment.ts
    ├── check-health.ts
    ├── get-env-vars.ts
    ├── update-env-vars.ts
    ├── get-logs.ts
    ├── suspend-service.ts
    ├── resume-service.ts
    └── cancel-deployment.ts
```

### Adding New Tools

1. Create a new tool file in `src/tools/`
2. Implement the `Tool` interface
3. Add the tool to `src/tools/index.ts`

Example tool structure:
```typescript
import { Tool } from './types.js';

export const myTool: Tool = {
  name: 'my_tool',
  description: 'Description of what the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      // Define input parameters
    },
    required: ['requiredParam'],
    additionalProperties: false,
  },
  handler: async (args, renderClient, logger) => {
    // Implement tool logic
    return result;
  },
};
```

### Development Commands

```bash
# Install dependencies
npm install

# Development with auto-reload
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Security Features

- **API Key Protection**: Secure handling of Render API credentials
- **Input Validation**: Zod schema validation for all API interactions
- **Environment Variable Masking**: Sensitive values are masked by default
- **Error Handling**: Comprehensive error handling with detailed logging
- **Type Safety**: Full TypeScript implementation with strict typing

## Error Handling

The server includes comprehensive error handling:

- **API Errors**: Proper handling of Render API errors with context
- **Validation Errors**: Input validation with clear error messages
- **Network Errors**: Retry logic and timeout handling
- **Authentication Errors**: Clear feedback for API key issues

## Logging

Structured logging with Winston:

- **Request/Response Logging**: All API calls are logged
- **Error Tracking**: Detailed error logs with stack traces
- **Performance Monitoring**: Request timing and success rates
- **Security Auditing**: Access and operation logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run linting and tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

1. Check the logs for detailed error information
2. Verify your Render API key has proper permissions
3. Ensure the Render service IDs/names are correct
4. Review the Render API documentation for service-specific requirements

## Changelog

### v1.0.0
- Initial release with complete Render API integration
- All 11 core tools implemented
- Comprehensive error handling and logging
- Security features and input validation
- TypeScript implementation with full type safety