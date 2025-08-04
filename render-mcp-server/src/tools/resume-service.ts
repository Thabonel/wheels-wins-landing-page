/**
 * Resume Service Tool
 * 
 * Resume a suspended service.
 */

import { Tool } from './types.js';

export const resumeService: Tool = {
  name: 'resume_service',
  description: 'Resume a suspended service to bring it back online',
  inputSchema: {
    type: 'object',
    properties: {
      serviceId: {
        type: 'string',
        description: 'The ID of the service to resume',
      },
      serviceName: {
        type: 'string',
        description: 'The name of the service to resume (alternative to serviceId)',
      },
      reason: {
        type: 'string',
        description: 'Optional reason for resuming the service (for logging)',
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
    const reason = args.reason || 'Manual resumption via MCP server';
    
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

    logger.info(`Resuming service: ${serviceId} (reason: ${reason})`);
    
    try {
      // Get service info first
      const service = await renderClient.getService(serviceId);
      
      // Check if already running
      if (service.suspended === 'not_suspended') {
        const result = {
          service: {
            id: service.id,
            name: service.name,
            type: service.type,
            suspended: service.suspended,
          },
          action: 'none',
          message: `Service '${service.name}' is already running`,
          warning: 'No action taken - service was already in active state',
        };
        
        logger.info(`Service ${service.name} is already running`);
        return result;
      }

      // Resume the service
      await renderClient.resumeService(serviceId);
      
      // Verify resumption and wait a moment for status to update
      await new Promise(resolve => setTimeout(resolve, 2000));
      const updatedService = await renderClient.getService(serviceId);
      
      // Check if resumption triggered a deployment
      const deployments = await renderClient.getDeployments(serviceId, 5);
      const recentDeployment = deployments.find(d => 
        new Date(d.createdAt).getTime() > Date.now() - 300000 // Within last 5 minutes
      );

      const result = {
        service: {
          id: service.id,
          name: service.name,
          type: service.type,
          url: service.serviceDetails?.url,
        },
        resumption: {
          previousStatus: service.suspended,
          currentStatus: updatedService.suspended,
          reason,
          resumedAt: new Date().toISOString(),
          deploymentTriggered: !!recentDeployment,
        },
        action: 'resumed',
        message: `Successfully resumed service '${service.name}'`,
        deployment: recentDeployment ? {
          id: recentDeployment.id,
          status: recentDeployment.status,
          createdAt: recentDeployment.createdAt,
        } : null,
        impact: {
          serviceOnline: true,
          computeChargesResume: 'Service will start incurring compute charges',
          startupTime: 'Service may take a few minutes to fully start up',
        },
        nextSteps: [
          'Service is starting up and will be online shortly',
          recentDeployment 
            ? `Monitor deployment ${recentDeployment.id} with get_deployments tool`
            : 'Check service health with check_health tool in a few minutes',
          `Verify service is responding at: ${  service.serviceDetails?.url || 'service URL'}`,
        ],
      };

      logger.info(`Successfully resumed service ${service.name}`);
      return result;
    } catch (error) {
      logger.error(`Failed to resume service ${serviceId}:`, error);
      throw error;
    }
  },
};