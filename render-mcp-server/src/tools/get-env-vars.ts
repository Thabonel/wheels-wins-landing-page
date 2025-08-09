/**
 * Get Environment Variables Tool
 * 
 * Get environment variables for a service.
 */

import { Tool } from './types.js';

export const getEnvVars: Tool = {
  name: 'get_env_vars',
  description: 'Get environment variables for a service (values are masked for security)',
  inputSchema: {
    type: 'object',
    properties: {
      serviceId: {
        type: 'string',
        description: 'The ID of the service to get environment variables for',
      },
      serviceName: {
        type: 'string',
        description: 'The name of the service to get environment variables for (alternative to serviceId)',
      },
      showValues: {
        type: 'boolean',
        description: 'Whether to show actual values (USE WITH CAUTION - only for debugging)',
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
    const showValues = args.showValues || false;
    
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

    logger.info(`Fetching environment variables for service: ${serviceId}`);
    
    try {
      const [service, envVars] = await Promise.all([
        renderClient.getService(serviceId),
        renderClient.getEnvVars(serviceId),
      ]);

      // Helper function to mask sensitive values
      const maskValue = (key: string, value: string): string => {
        if (showValues) {
          return value;
        }
        
        // Common sensitive key patterns
        const sensitivePatterns = [
          /password/i,
          /secret/i,
          /key/i,
          /token/i,
          /auth/i,
          /credential/i,
          /api_key/i,
          /private/i,
        ];
        
        const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));
        
        if (isSensitive) {
          return value.length > 0 ? '*'.repeat(Math.min(value.length, 8)) : '';
        }
        
        // For non-sensitive variables, show first few characters
        if (value.length > 10) {
          return `${value.substring(0, 4)  }...${  value.substring(value.length - 2)}`;
        }
        
        return value;
      };

      const maskedEnvVars = envVars.map(envVar => ({
        key: envVar.key,
        value: maskValue(envVar.key, envVar.value),
        isMasked: !showValues && envVar.value !== maskValue(envVar.key, envVar.value),
      }));

      // Categorize environment variables
      const categorized = {
        database: maskedEnvVars.filter(env => 
          /database|db_|postgres|mysql|mongo/i.test(env.key)
        ),
        security: maskedEnvVars.filter(env => 
          /key|secret|token|auth|password|credential/i.test(env.key)
        ),
        external_apis: maskedEnvVars.filter(env => 
          /api_|_api|service_|webhook/i.test(env.key)
        ),
        application: maskedEnvVars.filter(env => 
          /port|host|env|mode|debug|log/i.test(env.key)
        ),
        other: maskedEnvVars.filter(env => {
          const key = env.key.toLowerCase();
          return ![
            /database|db_|postgres|mysql|mongo/i,
            /key|secret|token|auth|password|credential/i,
            /api_|_api|service_|webhook/i,
            /port|host|env|mode|debug|log/i,
          ].some(pattern => pattern.test(key));
        }),
      };

      const result = {
        service: {
          id: service.id,
          name: service.name,
          type: service.type,
        },
        envVars: {
          total: envVars.length,
          showingValues: showValues,
          categorized,
          all: maskedEnvVars,
        },
        security: {
          sensitiveVarsCount: maskedEnvVars.filter(env => env.isMasked).length,
          warning: showValues 
            ? '⚠️  SECURITY WARNING: Actual values are being displayed!'
            : '🔒 Values are masked for security. Use showValues: true to reveal (use with caution).',
        },
      };

      logger.info(`Found ${envVars.length} environment variables for service ${service.name}`);
      return result;
    } catch (error) {
      logger.error(`Failed to get environment variables for service ${serviceId}:`, error);
      throw error;
    }
  },
};