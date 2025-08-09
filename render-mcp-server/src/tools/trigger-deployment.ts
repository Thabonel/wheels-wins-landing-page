/**
 * Trigger Deployment Tool
 * 
 * Trigger a new deployment for a service.
 */

import { Tool } from './types.js';

export const triggerDeployment: Tool = {
  name: 'trigger_deployment',
  description: 'Trigger a new deployment for a service',
  inputSchema: {
    type: 'object',
    properties: {
      serviceId: {
        type: 'string',
        description: 'The ID of the service to deploy',
      },
      serviceName: {
        type: 'string',
        description: 'The name of the service to deploy (alternative to serviceId)',
      },
      clearCache: {
        type: 'boolean',
        description: 'Whether to clear the build cache before deploying (default: false)',
        default: false,
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
    const clearCache = args.clearCache || false;
    
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

    logger.info(`Triggering deployment for service: ${serviceId}${clearCache ? ' (with cache clear)' : ''}`);
    
    try {
      // Get service info first
      const service = await renderClient.getService(serviceId);
      
      // Trigger the deployment
      const deployment = await renderClient.triggerDeployment(serviceId, clearCache);
      
      const result = {
        deployment: {
          id: deployment.id,
          status: deployment.status,
          commit: deployment.commit,
          createdAt: deployment.createdAt,
          clearCache,
        },
        service: {
          id: service.id,
          name: service.name,
          type: service.type,
          url: service.serviceDetails?.url,
        },
        message: `Successfully triggered deployment ${deployment.id} for service '${service.name}'`,
        monitoring: {
          checkStatusCommand: `get_deployments with serviceId: ${serviceId}`,
          directLink: `https://dashboard.render.com/services/${serviceId}`,
        },
      };

      logger.info(`Successfully triggered deployment ${deployment.id} for service ${service.name}`);
      return result;
    } catch (error) {
      logger.error(`Failed to trigger deployment for service ${serviceId}:`, error);
      throw error;
    }
  },
};