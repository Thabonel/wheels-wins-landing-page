#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import pino from 'pino';
import { config } from 'dotenv';
import { createServer } from 'http';
import { parse } from 'url';

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

async function initializeServer(): Promise<void> {
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
    logger.error('Failed to connect to Supabase. Check your configuration.');
    process.exit(1);
  }

  logger.info('PAM Supabase MCP Server initialized successfully', {
    serverName: appConfig.MCP_SERVER_NAME,
    version: appConfig.MCP_SERVER_VERSION,
  });
}

// Create the server instance
const server = new Server(
  {
    name: 'pam-supabase-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Rate limiting middleware
function checkRateLimit(identifier: string): void {
  if (!rateLimiter.isAllowed(identifier)) {
    throw new McpError(
      ErrorCode.InternalError,
      `Rate limit exceeded for ${identifier}. Please try again later.`
    );
  }
}

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  logger.debug('Listing available resources');
  
  return {
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
      {
        uri: 'supabase://queries/analysis',
        mimeType: 'application/json',
        name: 'Financial Analysis Queries',
        description: 'Pre-built analytical queries for financial insights',
      },
    ],
  };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  logger.debug('Reading resource', { uri });

  if (uri === 'supabase://queries/analysis') {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            availableQueries: ['top_spend_categories', 'monthly_burn_rate', 'fuel_cost_trend'],
            description: 'Predefined analytical queries for financial insights',
            usage: 'Use run_named_query tool with query name and parameters',
          }),
        },
      ],
    };
  }

  throw new McpError(
    ErrorCode.InvalidRequest,
    `Resource not found: ${uri}`
  );
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.debug('Listing available tools');
  
  return {
    tools: [
      {
        name: 'get_expenses',
        description: 'Retrieve user expenses with optional filtering by date range and category',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID (UUID format)',
            },
            since: {
              type: 'string',
              format: 'date',
              description: 'Start date (YYYY-MM-DD format)',
            },
            until: {
              type: 'string',
              format: 'date', 
              description: 'End date (YYYY-MM-DD format)',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 500,
              default: 100,
              description: 'Maximum number of records to return',
            },
            category: {
              type: 'string',
              description: 'Filter by expense category (partial match)',
            },
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
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID (UUID format)',
            },
            active_only: {
              type: 'boolean',
              default: true,
              description: 'Return only active budgets',
            },
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
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID (UUID format)',
            },
            since: {
              type: 'string',
              format: 'date',
              description: 'Start date (YYYY-MM-DD format)',
            },
            until: {
              type: 'string',
              format: 'date',
              description: 'End date (YYYY-MM-DD format)',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 500,
              default: 100,
              description: 'Maximum number of records to return',
            },
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
              description: 'Name of the predefined query to execute',
            },
            params_json: {
              type: 'string',
              description: 'JSON array of parameters for the query',
            },
          },
          required: ['name', 'params_json'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  // Rate limiting based on tool name
  checkRateLimit(`tool:${name}`);
  
  logger.debug('Tool call received', { name, args });

  try {
    switch (name) {
      case 'get_expenses': {
        const params = GetExpensesSchema.parse(args);
        const results = await supabaseService.getExpenses(params);
        
        logger.info('get_expenses completed', { 
          userId: params.user_id, 
          recordCount: results.length 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                data: results,
                count: results.length,
                filters: {
                  since: params.since,
                  until: params.until,
                  category: params.category,
                  limit: params.limit,
                },
              }, null, 2),
            },
          ],
        };
      }

      case 'get_budgets': {
        const params = GetBudgetsSchema.parse(args);
        const results = await supabaseService.getBudgets(params);
        
        logger.info('get_budgets completed', { 
          userId: params.user_id, 
          recordCount: results.length 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                data: results,
                count: results.length,
                filters: {
                  active_only: params.active_only,
                },
              }, null, 2),
            },
          ],
        };
      }

      case 'get_income': {
        const params = GetIncomeSchema.parse(args);
        const results = await supabaseService.getIncome(params);
        
        logger.info('get_income completed', { 
          userId: params.user_id, 
          recordCount: results.length 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                data: results,
                count: results.length,
                filters: {
                  since: params.since,
                  until: params.until,
                  limit: params.limit,
                },
              }, null, 2),
            },
          ],
        };
      }

      case 'run_named_query': {
        const params = RunNamedQuerySchema.parse(args);
        
        // Load and validate the query
        const query = await queryValidator.loadNamedQuery(params.name);
        const queryParams = QueryValidator.validateParams(params.params_json);
        
        // Execute the query
        const results = await supabaseService.executeRawQuery(query, queryParams);
        
        logger.info('run_named_query completed', { 
          queryName: params.name,
          recordCount: Array.isArray(results) ? results.length : 0
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                query_name: params.name,
                data: results,
                count: Array.isArray(results) ? results.length : 0,
                parameters: queryParams,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    logger.error('Tool execution failed', { name, error: error instanceof Error ? error.message : error });
    
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`
      );
    }
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

// Cleanup on exit
process.on('SIGINT', () => {
  logger.info('Shutting down PAM Supabase MCP Server');
  rateLimiter.cleanup();
  process.exit(0);
});


// Start the server
async function main() {
  try {
    await initializeServer();
    
    const config = ConfigSchema.parse(process.env);
    
    // Create HTTP server for MCP endpoint
    const httpServer = createServer(async (req, res) => {
      const parsedUrl = parse(req.url || '/', true);
      
      // Health check endpoint
      if (parsedUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
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
              
              // Handle MCP requests directly
              let response;
              if (request.method === 'tools/list') {
                response = await server.request(ListToolsRequestSchema, request);
              } else if (request.method === 'tools/call') {
                response = await server.request(CallToolRequestSchema, request);
              } else if (request.method === 'resources/list') {
                response = await server.request(ListResourcesRequestSchema, request);
              } else if (request.method === 'resources/read') {
                response = await server.request(ReadResourceRequestSchema, request);
              } else {
                response = { 
                  jsonrpc: '2.0', 
                  id: request.id, 
                  error: { code: -32601, message: 'Method not found' }
                };
              }
              
              res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
              });
              res.end(JSON.stringify(response));
            } catch (error) {
              logger.error('MCP request failed', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Internal server error' }));
            }
          });
        } else if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          });
          res.end();
        } else {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        return;
      }
      
      // Default response
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found', availableEndpoints: ['/health', '/mcp'] }));
    });
    
    httpServer.listen(config.PORT, () => {
      logger.info(`PAM Supabase MCP Server running on port ${config.PORT}`);
      logger.info(`Health check: http://localhost:${config.PORT}/health`);
      logger.info(`MCP endpoint: http://localhost:${config.PORT}/mcp`);
    });
    
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Server startup failed:', error);
    process.exit(1);
  });
}