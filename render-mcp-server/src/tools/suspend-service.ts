/**
 * Suspend Service Tool
 * 
 * Suspend a service to stop it from running.
 */

import { Tool } from './types.js';

export const suspendService: Tool = {
  name: 'suspend_service',
  description: 'Suspend a service to stop it from running (useful for cost management or maintenance)',
  inputSchema: {
    type: 'object',
    properties: {
      serviceId: {
        type: 'string',
        description: 'The ID of the service to suspend',
      },
      serviceName: {
        type: 'string',
        description: 'The name of the service to suspend (alternative to serviceId)',
      },
      reason: {
        type: 'string',
        description: 'Optional reason for suspending the service (for logging)',
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
    const reason = args.reason || 'Manual suspension via MCP server';
    
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

    logger.info(`Suspending service: ${serviceId} (reason: ${reason})`);
    
    try {
      // Get service info first
      const service = await renderClient.getService(serviceId);
      
      // Check if already suspended
      if (service.suspended === 'suspended') {
        const result = {
          service: {
            id: service.id,
            name: service.name,
            type: service.type,
            suspended: service.suspended,
          },
          action: 'none',
          message: `Service '${service.name}' is already suspended`,
          warning: 'No action taken - service was already in suspended state',
        };
        
        logger.info(`Service ${service.name} is already suspended`);
        return result;
      }

      // Get current status before suspension
      const healthCheck = await renderClient.checkServiceHealth(serviceId);
      
      // Suspend the service
      await renderClient.suspendService(serviceId);
      
      // Verify suspension
      const updatedService = await renderClient.getService(serviceId);
      
      const result = {
        service: {
          id: service.id,
          name: service.name,
          type: service.type,
          url: service.serviceDetails?.url,
        },
        suspension: {
          previousStatus: service.suspended,
          currentStatus: updatedService.suspended,
          reason,
          suspendedAt: new Date().toISOString(),
          previousHealth: healthCheck,
        },
        action: 'suspended',
        message: `Successfully suspended service '${service.name}'`,
        impact: {
          serviceUnavailable: true,
          costSavings: 'Service will not incur compute charges while suspended',
          dataRetention: 'All data and configuration are preserved',
        },
        nextSteps: [
          'Service is now offline and will not respond to requests',
          'Use resume_service tool to bring the service back online',
          'Monitor cost savings in your Render dashboard',
        ],
      };

      logger.info(`Successfully suspended service ${service.name}`);
      return result;
    } catch (error) {
      logger.error(`Failed to suspend service ${serviceId}:`, error);
      throw error;
    }
  },
};