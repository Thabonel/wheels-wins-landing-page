/**
 * Get Service Tool
 * 
 * Get detailed information about a specific service.
 */

import { Tool } from './types.js';

export const getService: Tool = {
  name: 'get_service',
  description: 'Get detailed information about a specific service by ID or name',
  inputSchema: {
    type: 'object',
    properties: {
      serviceId: {
        type: 'string',
        description: 'The ID of the service to get information for',
      },
      serviceName: {
        type: 'string',
        description: 'The name of the service to get information for (alternative to serviceId)',
      },
    },
    oneOf: [
      { required: ['serviceId'] },
      { required: ['serviceName'] },
    ],
    additionalProperties: false,
  },
  handler: async (args, renderClient, logger) => {
    let serviceId = args.serviceId;
    
    // If serviceName is provided instead of serviceId, find the service
    if (!serviceId && args.serviceName) {
      logger.info(`Looking up service by name: ${args.serviceName}`);
      const services = await renderClient.getServices();
      const service = services.find(s => s.name === args.serviceName);
      
      if (!service) {
        throw new Error(`Service with name '${args.serviceName}' not found`);
      }
      
      serviceId = service.id;
      logger.info(`Found service '${args.serviceName}' with ID: ${serviceId}`);
    }

    logger.info(`Fetching service details for ID: ${serviceId}`);
    
    try {
      const service = await renderClient.getService(serviceId);
      
      // Get additional information
      const [deployments, healthCheck] = await Promise.all([
        renderClient.getDeployments(serviceId, 5),
        renderClient.checkServiceHealth(serviceId),
      ]);

      const result = {
        service,
        health: healthCheck,
        recentDeployments: deployments.map(d => ({
          id: d.id,
          status: d.status,
          commit: d.commit,
          createdAt: d.createdAt,
          finishedAt: d.finishedAt,
        })),
        summary: {
          isHealthy: healthCheck.status === 'healthy',
          totalDeployments: deployments.length,
          latestDeploymentStatus: deployments[0]?.status || 'none',
        },
      };

      logger.info(`Successfully fetched service details for ${service.name}`);
      return result;
    } catch (error) {
      logger.error(`Failed to get service ${serviceId}:`, error);
      throw error;
    }
  },
};