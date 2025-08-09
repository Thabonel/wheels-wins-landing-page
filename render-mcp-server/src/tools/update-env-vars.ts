/**
 * Update Environment Variables Tool
 * 
 * Update environment variables for a service.
 */

import { Tool } from './types.js';

export const updateEnvVars: Tool = {
  name: 'update_env_vars',
  description: 'Update environment variables for a service. This will trigger a new deployment.',
  inputSchema: {
    type: 'object',
    properties: {
      serviceId: {
        type: 'string',
        description: 'The ID of the service to update environment variables for',
      },
      serviceName: {
        type: 'string',
        description: 'The name of the service to update environment variables for (alternative to serviceId)',
      },
      envVars: {
        type: 'array',
        description: 'Array of environment variables to update',
        items: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Environment variable name',
            },
            value: {
              type: 'string',
              description: 'Environment variable value',
            },
          },
          required: ['key', 'value'],
          additionalProperties: false,
        },
        minItems: 1,
      },
      replaceAll: {
        type: 'boolean',
        description: 'Whether to replace all environment variables (true) or merge with existing (false)',
        default: false,
      },
    },
    oneOf: [
      { required: ['serviceId', 'envVars'] },
      { required: ['serviceName', 'envVars'] },
    ],
    additionalProperties: false,
  },
  handler: async (args, renderClient, logger) => {
    let serviceId = args.serviceId;
    const newEnvVars = args.envVars;
    const replaceAll = args.replaceAll || false;
    
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

    logger.info(`Updating environment variables for service: ${serviceId}`);
    
    try {
      const [service, currentEnvVars] = await Promise.all([
        renderClient.getService(serviceId),
        renderClient.getEnvVars(serviceId),
      ]);

      // Validate environment variable keys
      const invalidKeys = newEnvVars.filter((env: any) => 
        !env.key || 
        env.key.trim() === '' ||
        !/^[A-Z_][A-Z0-9_]*$/i.test(env.key)
      );
      
      if (invalidKeys.length > 0) {
        throw new Error(`Invalid environment variable keys: ${invalidKeys.map((k: any) => k.key).join(', ')}`);
      }

      let finalEnvVars;
      
      if (replaceAll) {
        // Replace all environment variables
        finalEnvVars = newEnvVars;
        logger.info(`Replacing all environment variables (${currentEnvVars.length} → ${newEnvVars.length})`);
      } else {
        // Merge with existing environment variables
        const envVarMap = new Map(currentEnvVars.map(env => [env.key, env.value]));
        
        // Update with new values
        newEnvVars.forEach((env: any) => {
          envVarMap.set(env.key, env.value);
        });
        
        finalEnvVars = Array.from(envVarMap.entries()).map(([key, value]) => ({
          key,
          value,
        }));
        
        logger.info(`Merging environment variables (${currentEnvVars.length} existing + ${newEnvVars.length} updates = ${finalEnvVars.length} total)`);
      }

      // Update environment variables
      await renderClient.updateEnvVars(serviceId, finalEnvVars);

      // Check if the update will trigger a deployment
      const willTriggerDeployment = service.autoDeploy === 'yes';

      const result = {
        service: {
          id: service.id,
          name: service.name,
          type: service.type,
          autoDeploy: service.autoDeploy,
        },
        update: {
          operation: replaceAll ? 'replace_all' : 'merge',
          previousCount: currentEnvVars.length,
          newCount: finalEnvVars.length,
          updatedKeys: newEnvVars.map((env: any) => env.key),
          willTriggerDeployment,
        },
        changes: newEnvVars.map((env: any) => {
          const existing = currentEnvVars.find((existing: any) => existing.key === env.key);
          return {
            key: env.key,
            action: existing ? 'updated' : 'added',
            valueChanged: existing ? existing.value !== env.value : true,
          };
        }),
        message: `Successfully updated ${newEnvVars.length} environment variable(s) for service '${service.name}'`,
        nextSteps: willTriggerDeployment 
          ? ['🚀 Automatic deployment will be triggered shortly', 'Monitor deployment status with get_deployments tool']
          : ['⚠️ Manual deployment required (auto-deploy is disabled)', 'Use trigger_deployment tool to deploy changes'],
      };

      logger.info(`Successfully updated environment variables for service ${service.name}`);
      return result;
    } catch (error) {
      logger.error(`Failed to update environment variables for service ${serviceId}:`, error);
      throw error;
    }
  },
};