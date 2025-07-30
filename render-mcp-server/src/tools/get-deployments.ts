/**
 * Get Deployments Tool
 * 
 * Get deployment history for a specific service.
 */

import { Tool } from './types.js';

export const getDeployments: Tool = {
  name: 'get_deployments',
  description: 'Get deployment history for a specific service',
  inputSchema: {
    type: 'object',
    properties: {
      serviceId: {
        type: 'string',
        description: 'The ID of the service to get deployments for',
      },
      serviceName: {
        type: 'string',
        description: 'The name of the service to get deployments for (alternative to serviceId)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of deployments to return (default: 20)',
        minimum: 1,
        maximum: 100,
        default: 20,
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
    const limit = args.limit || 20;
    
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

    logger.info(`Fetching ${limit} deployments for service: ${serviceId}`);
    
    try {
      const deployments = await renderClient.getDeployments(serviceId, limit);
      
      const deploymentsSummary = deployments.map(deployment => ({
        id: deployment.id,
        status: deployment.status,
        commit: {
          id: deployment.commit.id,
          message: deployment.commit.message,
          createdAt: deployment.commit.createdAt,
        },
        createdAt: deployment.createdAt,
        updatedAt: deployment.updatedAt,
        finishedAt: deployment.finishedAt,
        duration: deployment.finishedAt 
          ? new Date(deployment.finishedAt).getTime() - new Date(deployment.createdAt).getTime()
          : null,
      }));

      const statusCounts = deployments.reduce((acc, deployment) => {
        acc[deployment.status] = (acc[deployment.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const result = {
        total: deployments.length,
        statusCounts,
        deployments: deploymentsSummary,
        summary: {
          latest: deployments[0] ? {
            id: deployments[0].id,
            status: deployments[0].status,
            createdAt: deployments[0].createdAt,
            commit: deployments[0].commit.message,
          } : null,
          successRate: deployments.length > 0 
            ? ((statusCounts.live || 0) / deployments.length * 100).toFixed(1) + '%'
            : 'N/A',
        },
      };

      logger.info(`Found ${deployments.length} deployments for service ${serviceId}`);
      return result;
    } catch (error) {
      logger.error(`Failed to get deployments for service ${serviceId}:`, error);
      throw error;
    }
  },
};