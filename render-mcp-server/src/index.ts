#!/usr/bin/env node

/**
 * Render MCP Server for Wheels & Wins Deployment Automation
 * 
 * This Model Context Protocol server provides tools for managing
 * deployments on Render.com, including service monitoring,
 * environment variable management, and automated deployment workflows.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import winston from 'winston';
import { RenderClient } from './render-client.js';
import { tools } from './tools/index.js';

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class RenderMCPServer {
  private server: Server;
  private renderClient: RenderClient;

  constructor() {
    this.server = new Server(
      {
        name: 'render-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.renderClient = new RenderClient();
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.info('Listing available tools...');
      
      return {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info(`Executing tool: ${name}`, { arguments: args });

      try {
        // Find the requested tool
        const tool = tools.find(t => t.name === name);
        if (!tool) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Tool '${name}' not found`
          );
        }

        // Execute the tool
        const result = await tool.handler(args, this.renderClient, logger);
        
        logger.info(`Tool '${name}' executed successfully`);
        
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error(`Error executing tool '${name}':`, error);
        
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  async start() {
    logger.info('Starting Render MCP Server...');
    
    // Validate environment
    await this.renderClient.validateConnection();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    logger.info('🚀 Render MCP Server is running and ready for requests');
  }
}

// Start the server
const server = new RenderMCPServer();
server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});