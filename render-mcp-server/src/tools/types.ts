/**
 * Types for MCP Tools
 */

import { JSONSchema7 } from 'json-schema';
import winston from 'winston';
import { RenderClient } from '../render-client.js';

export interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
  handler: (
    args: any,
    renderClient: RenderClient,
    logger: winston.Logger
  ) => Promise<any>;
}