/**
 * List Services Tool
 * 
 * Lists all services in the Render account with their current status.
 */

import { Tool } from './types.js';

export const listServices: Tool = {
  name: 'list_services',
  description: 'List all services in your Render account with their current status and basic information',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async (args, renderClient, logger) => {
    logger.info('Fetching all services...');
    
    try {
      const services = await renderClient.getServices();
      
      const servicesSummary = services.map(service => ({
        id: service.id,
        name: service.name,
        type: service.type,
        env: service.env,
        plan: service.plan,
        region: service.region,
        suspended: service.suspended,
        autoDeploy: service.autoDeploy,
        repo: service.repo,
        branch: service.branch,
        url: service.serviceDetails?.url,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
      }));

      const summary = {
        total: services.length,
        byType: services.reduce((acc, service) => {
          acc[service.type] = (acc[service.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        suspended: services.filter(s => s.suspended === 'suspended').length,
        active: services.filter(s => s.suspended === 'not_suspended').length,
        services: servicesSummary,
      };

      logger.info(`Found ${services.length} services`);
      return summary;
    } catch (error) {
      logger.error('Failed to list services:', error);
      throw error;
    }
  },
};