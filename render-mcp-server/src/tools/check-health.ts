/**
 * Check Health Tool
 * 
 * Check the health status of a service.
 */

import { Tool } from './types.js';

export const checkHealth: Tool = {
  name: 'check_health',
  description: 'Check the health status of a service including deployment status and recent activity',
  inputSchema: {
    type: 'object',
    properties: {
      serviceId: {
        type: 'string',
        description: 'The ID of the service to check',
      },
      serviceName: {
        type: 'string',
        description: 'The name of the service to check (alternative to serviceId)',
      },
      includeLogs: {
        type: 'boolean',
        description: 'Whether to include recent logs in the health check (default: false)',
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
    const includeLogs = args.includeLogs || false;
    
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

    logger.info(`Checking health for service: ${serviceId}`);
    
    try {
      // Gather health information
      const [service, healthCheck, deployments, logs] = await Promise.all([
        renderClient.getService(serviceId),
        renderClient.checkServiceHealth(serviceId),
        renderClient.getDeployments(serviceId, 5),
        includeLogs ? renderClient.getServiceLogs(serviceId, 20) : Promise.resolve([]),
      ]);

      const latestDeployment = deployments[0];
      const recentFailures = deployments.filter(d => 
        d.status === 'build_failed' || d.status === 'update_failed'
      ).length;

      // Calculate uptime based on deployment history
      const liveDeployments = deployments.filter(d => d.status === 'live').length;
      const uptime = deployments.length > 0 
        ? (liveDeployments / deployments.length * 100).toFixed(1) + '%'
        : 'N/A';

      const result = {
        service: {
          id: service.id,
          name: service.name,
          type: service.type,
          suspended: service.suspended,
          url: service.serviceDetails?.url,
        },
        health: {
          status: healthCheck.status,
          message: healthCheck.message,
          isHealthy: healthCheck.status === 'healthy',
          uptime,
        },
        deployment: latestDeployment ? {
          id: latestDeployment.id,
          status: latestDeployment.status,
          commit: latestDeployment.commit,
          createdAt: latestDeployment.createdAt,
          finishedAt: latestDeployment.finishedAt,
        } : null,
        metrics: {
          totalDeployments: deployments.length,
          recentFailures,
          successRate: deployments.length > 0 
            ? ((deployments.length - recentFailures) / deployments.length * 100).toFixed(1) + '%'
            : 'N/A',
        },
        recommendations: [],
        ...(includeLogs && { recentLogs: logs.slice(-10) }),
      };

      // Add recommendations based on health status
      if (service.suspended === 'suspended') {
        result.recommendations.push('Service is suspended - consider resuming if needed');
      }
      
      if (healthCheck.status === 'failed') {
        result.recommendations.push('Latest deployment failed - check logs and consider rollback');
      }
      
      if (recentFailures > 2) {
        result.recommendations.push('Multiple recent failures detected - investigate build issues');
      }
      
      if (service.autoDeploy === 'no') {
        result.recommendations.push('Auto-deploy is disabled - deployments require manual triggering');
      }

      logger.info(`Health check completed for service ${service.name}: ${healthCheck.status}`);
      return result;
    } catch (error) {
      logger.error(`Failed to check health for service ${serviceId}:`, error);
      throw error;
    }
  },
};