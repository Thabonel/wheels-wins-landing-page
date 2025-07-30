/**
 * MCP Tools Registry
 * 
 * Exports all available tools for the Render MCP server.
 */

import { Tool } from './types.js';
import { listServices } from './list-services.js';
import { getService } from './get-service.js';
import { getDeployments } from './get-deployments.js';
import { triggerDeployment } from './trigger-deployment.js';
import { checkHealth } from './check-health.js';
import { getEnvVars } from './get-env-vars.js';
import { updateEnvVars } from './update-env-vars.js';
import { getLogs } from './get-logs.js';
import { suspendService } from './suspend-service.js';
import { resumeService } from './resume-service.js';
import { cancelDeployment } from './cancel-deployment.js';

export const tools: Tool[] = [
  listServices,
  getService,
  getDeployments,
  triggerDeployment,
  checkHealth,
  getEnvVars,
  updateEnvVars,
  getLogs,
  suspendService,
  resumeService,
  cancelDeployment,
];

export * from './types.js';