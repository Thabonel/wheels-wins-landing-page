#!/usr/bin/env node

import { createServer } from 'http';
import { parse } from 'url';
import pino from 'pino';
import { config } from 'dotenv';

import {
  Config,
  ConfigSchema,
  GetExpensesSchema,
  GetBudgetsSchema, 
  GetIncomeSchema,
  RunNamedQuerySchema,
} from './types.js';
import { SupabaseService } from './supabase-client.js';
import { QueryValidator } from './query-validator.js';
import { TokenBucketRateLimiter } from './rate-limiter.js';

// Load environment variables
config();

let logger: pino.Logger;
let supabaseService: SupabaseService;
let queryValidator: QueryValidator;
let rateLimiter: TokenBucketRateLimiter;

async function initializeServices(): Promise<void> {
  // Parse and validate configuration
  const configResult = ConfigSchema.safeParse(process.env);
  if (!configResult.success) {
    console.error('Configuration validation failed:', configResult.error.errors);
    process.exit(1);
  }
  
  const appConfig: Config = configResult.data;
  
  // Initialize logger
  logger = pino({ 
    level: appConfig.LOG_LEVEL,
    formatters: {
      level: (label) => ({ level: label })
    }
  });

  // Initialize services
  supabaseService = new SupabaseService(appConfig);
  queryValidator = new QueryValidator();
  rateLimiter = new TokenBucketRateLimiter(
    appConfig.MAX_REQUESTS_PER_MINUTE,
    appConfig.RATE_LIMIT_WINDOW_MS
  );

  // Test Supabase connection
  const connectionOk = await supabaseService.testConnection();
  if (!connectionOk) {
    logger.warn('Supabase connection test failed - this is expected with dummy credentials');
  }

  logger.info('PAM Supabase MCP HTTP Server initialized successfully', {
    serverName: appConfig.MCP_SERVER_NAME,
    version: appConfig.MCP_SERVER_VERSION,
  });
}

// Handle MCP tools/list request
function handleToolsList(request: any) {
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      tools: [
        {
          name: 'get_expenses',
          description: 'Retrieve user expenses with optional filtering by date range and category',
          inputSchema: {
            type: 'object',
            properties: {
              user_id: { type: 'string', format: 'uuid', description: 'User ID (UUID format)' },
              since: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD format)' },
              until: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD format)' },
              limit: { type: 'integer', minimum: 1, maximum: 500, default: 100, description: 'Maximum number of records' },
              category: { type: 'string', description: 'Filter by expense category (partial match)' },
            },
            required: ['user_id'],
          },
        },
        {
          name: 'get_budgets',
          description: 'Retrieve user budgets and budget planning data',
          inputSchema: {
            type: 'object',
            properties: {
              user_id: { type: 'string', format: 'uuid', description: 'User ID (UUID format)' },
              active_only: { type: 'boolean', default: true, description: 'Return only active budgets' },
            },
            required: ['user_id'],
          },
        },
        {
          name: 'get_income',
          description: 'Retrieve user income records with optional date filtering',
          inputSchema: {
            type: 'object',
            properties: {
              user_id: { type: 'string', format: 'uuid', description: 'User ID (UUID format)' },
              since: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD format)' },
              until: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD format)' },
              limit: { type: 'integer', minimum: 1, maximum: 500, default: 100, description: 'Maximum number of records' },
            },
            required: ['user_id'],
          },
        },
        {
          name: 'run_named_query',
          description: 'Execute predefined analytical queries for financial insights',
          inputSchema: {
            type: 'object',
            properties: {
              name: { 
                type: 'string', 
                enum: ['top_spend_categories', 'monthly_burn_rate', 'fuel_cost_trend'],
                description: 'Name of the predefined query to execute' 
              },
              params_json: { type: 'string', description: 'JSON array of parameters for the query' },
            },
            required: ['name', 'params_json'],
          },
        },
      ],
    },
  };
}

// Handle MCP resources/list request
function handleResourcesList(request: any) {
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      resources: [
        {
          uri: 'supabase://tables/expenses',
          mimeType: 'application/json',
          name: 'User Expenses',
          description: 'Financial expense records for users',
        },
        {
          uri: 'supabase://tables/budgets',
          mimeType: 'application/json', 
          name: 'User Budgets',
          description: 'Budget planning and tracking data',
        },
        {
          uri: 'supabase://tables/income',
          mimeType: 'application/json',
          name: 'User Income',
          description: 'Income tracking and history',
        },
      ],
    },
  };
}

// Handle MCP tools/call request
async function handleToolsCall(request: any) {
  const { name, arguments: args } = request.params;
  
  // Rate limiting
  if (!rateLimiter.isAllowed(`tool:${name}`)) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: { code: -32000, message: 'Rate limit exceeded. Please try again later.' }
    };
  }
  
  try {
    let result;
    
    switch (name) {
      case 'get_expenses': {
        const params = GetExpensesSchema.parse(args);
        const data = await supabaseService.getExpenses(params);
        result = {
          success: true,
          data,
          count: data.length,
          filters: { since: params.since, until: params.until, category: params.category, limit: params.limit },
        };
        break;
      }
      
      case 'get_budgets': {
        const params = GetBudgetsSchema.parse(args);
        const data = await supabaseService.getBudgets(params);
        result = {
          success: true,
          data,
          count: data.length,
          filters: { active_only: params.active_only },
        };
        break;
      }
      
      case 'get_income': {
        const params = GetIncomeSchema.parse(args);
        const data = await supabaseService.getIncome(params);
        result = {
          success: true,
          data,
          count: data.length,
          filters: { since: params.since, until: params.until, limit: params.limit },
        };
        break;
      }
      
      case 'run_named_query': {
        const params = RunNamedQuerySchema.parse(args);
        const query = await queryValidator.loadNamedQuery(params.name);
        const queryParams = QueryValidator.validateParams(params.params_json);
        const data = await supabaseService.executeRawQuery(query, queryParams);
        result = {
          success: true,
          query_name: params.name,
          data,
          count: Array.isArray(data) ? data.length : 0,
          parameters: queryParams,
        };
        break;
      }
      
      default:
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: { code: -32601, message: `Unknown tool: ${name}` }
        };
    }
    
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      }
    };
    
  } catch (error) {
    logger.error('Tool execution failed', { name, error: error instanceof Error ? error.message : error });
    
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: { 
        code: -32000, 
        message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    };
  }
}

// Main server function
async function main() {
  try {
    await initializeServices();
    
    const config = ConfigSchema.parse(process.env);
    
    const server = createServer(async (req, res) => {
      const parsedUrl = parse(req.url || '/', true);
      
      // CORS headers for all responses
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
      }
      
      // Health check endpoint
      if (parsedUrl.pathname === '/health') {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          service: 'pam-supabase-mcp-server',
          endpoints: ['/health', '/mcp']
        }));
        return;
      }
      
      // MCP endpoint
      if (parsedUrl.pathname === '/mcp') {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', async () => {
            try {
              const request = JSON.parse(body);
              let response;
              
              switch (request.method) {
                case 'tools/list':
                  response = handleToolsList(request);
                  break;
                case 'resources/list':
                  response = handleResourcesList(request);
                  break;
                case 'tools/call':
                  response = await handleToolsCall(request);
                  break;
                default:
                  response = {
                    jsonrpc: '2.0',
                    id: request.id,
                    error: { code: -32601, message: `Method not found: ${request.method}` }
                  };
              }
              
              res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
              res.end(JSON.stringify(response));
              
            } catch (error) {
              logger.error('MCP request failed', error);
              res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                jsonrpc: '2.0', 
                error: { code: -32700, message: 'Parse error' } 
              }));
            }
          });
        } else {
          res.writeHead(405, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        return;
      }
      
      // Default response
      res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Not found', 
        availableEndpoints: ['/health', '/mcp'],
        usage: 'POST to /mcp with MCP JSON-RPC 2.0 requests'
      }));
    });
    
    server.listen(config.PORT, () => {
      logger.info(`🚀 PAM Supabase MCP HTTP Server running on port ${config.PORT}`);
      logger.info(`📊 Health check: http://localhost:${config.PORT}/health`);
      logger.info(`🔌 MCP endpoint: http://localhost:${config.PORT}/mcp`);
      logger.info(`🔗 For ChatGPT use: https://your-app.onrender.com/mcp`);
    });
    
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Cleanup on exit
process.on('SIGINT', () => {
  logger.info('Shutting down PAM Supabase MCP HTTP Server');
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Server startup failed:', error);
    process.exit(1);
  });
}