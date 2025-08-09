/**
 * Cancel Deployment Tool
 * 
 * Cancel an in-progress deployment.
 */

import { Tool } from './types.js';

export const cancelDeployment: Tool = {
  name: 'cancel_deployment',
  description: 'Cancel an in-progress deployment for a service',
  inputSchema: {
    type: 'object',
    properties: {
      serviceId: {
        type: 'string',
        description: 'The ID of the service',
      },
      serviceName: {
        type: 'string',
        description: 'The name of the service (alternative to serviceId)',
      },
      deploymentId: {
        type: 'string',
        description: 'The ID of the deployment to cancel (if not provided, cancels the latest in-progress deployment)',
      },
      reason: {
        type: 'string',
        description: 'Optional reason for canceling the deployment (for logging)',
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
    let deploymentId = args.deploymentId;
    const reason = args.reason || 'Manual cancellation via MCP server';
    
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

    logger.info(`Canceling deployment for service: ${serviceId}`);
    
    try {
      const [service, deployments] = await Promise.all([
        renderClient.getService(serviceId),
        renderClient.getDeployments(serviceId, 10),
      ]);

      // If no deploymentId provided, find the latest in-progress deployment
      if (!deploymentId) {
        const inProgressDeployment = deployments.find(d => 
          d.status === 'build_in_progress' || d.status === 'update_in_progress'
        );
        
        if (!inProgressDeployment) {
          const result = {
            service: {
              id: service.id,
              name: service.name,
              type: service.type,
            },
            action: 'none',
            message: `No in-progress deployments found for service '${service.name}'`,
            availableDeployments: deployments.slice(0, 3).map(d => ({
              id: d.id,
              status: d.status,
              createdAt: d.createdAt,
              canCancel: d.status === 'build_in_progress' || d.status === 'update_in_progress',
            })),
          };
          
          logger.info(`No in-progress deployments found for service ${service.name}`);
          return result;
        }
        
        deploymentId = inProgressDeployment.id;
        logger.info(`Found in-progress deployment: ${deploymentId} (${inProgressDeployment.status})`);
      }

      // Find the specific deployment
      const deployment = deployments.find(d => d.id === deploymentId);
      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found for service ${serviceId}`);
      }

      // Check if deployment can be canceled
      const cancelableStatuses = ['build_in_progress', 'update_in_progress'];
      if (!cancelableStatuses.includes(deployment.status)) {
        const result = {
          service: {
            id: service.id,
            name: service.name,
            type: service.type,
          },
          deployment: {
            id: deployment.id,
            status: deployment.status,
            createdAt: deployment.createdAt,
          },
          action: 'none',
          message: `Cannot cancel deployment ${deploymentId} - status is '${deployment.status}'`,
          warning: `Only deployments with status 'build_in_progress' or 'update_in_progress' can be canceled`,
        };
        
        logger.info(`Cannot cancel deployment ${deploymentId} - status is ${deployment.status}`);
        return result;
      }

      // Cancel the deployment
      await renderClient.cancelDeployment(serviceId, deploymentId);
      
      // Wait a moment and check updated status
      await new Promise(resolve => setTimeout(resolve, 2000));
      const updatedDeployments = await renderClient.getDeployments(serviceId, 10);
      const updatedDeployment = updatedDeployments.find(d => d.id === deploymentId);

      const result = {
        service: {
          id: service.id,
          name: service.name,
          type: service.type,
        },
        deployment: {
          id: deployment.id,
          previousStatus: deployment.status,
          currentStatus: updatedDeployment?.status || 'unknown',
          commit: deployment.commit,
          createdAt: deployment.createdAt,
        },
        cancellation: {
          reason,
          canceledAt: new Date().toISOString(),
          successful: updatedDeployment?.status === 'canceled',
        },
        action: 'canceled',
        message: `Successfully canceled deployment ${deploymentId} for service '${service.name}'`,
        impact: {
          serviceStatus: 'Previous deployment remains active',
          nextSteps: [
            'Canceled deployment will not go live',
            'Service continues running previous successful deployment',
            'You can trigger a new deployment when ready',
          ],
        },
      };

      logger.info(`Successfully canceled deployment ${deploymentId} for service ${service.name}`);
      return result;
    } catch (error) {
      logger.error(`Failed to cancel deployment for service ${serviceId}:`, error);
      throw error;
    }
  },
};