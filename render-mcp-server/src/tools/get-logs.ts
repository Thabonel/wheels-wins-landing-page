/**
 * Get Logs Tool
 * 
 * Get recent logs for a service.
 */

import { Tool } from './types.js';

export const getLogs: Tool = {
  name: 'get_logs',
  description: 'Get recent logs for a service to help with debugging and monitoring',
  inputSchema: {
    type: 'object',
    properties: {
      serviceId: {
        type: 'string',
        description: 'The ID of the service to get logs for',
      },
      serviceName: {
        type: 'string',
        description: 'The name of the service to get logs for (alternative to serviceId)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of log entries to return (default: 50)',
        minimum: 1,
        maximum: 1000,
        default: 50,
      },
      filterLevel: {
        type: 'string',
        description: 'Filter logs by level (error, warn, info, debug)',
        enum: ['error', 'warn', 'info', 'debug'],
      },
      search: {
        type: 'string',
        description: 'Search for specific text in log messages',
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
    const limit = args.limit || 50;
    const filterLevel = args.filterLevel;
    const search = args.search;
    
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

    logger.info(`Fetching logs for service: ${serviceId} (limit: ${limit})`);
    
    try {
      const [service, logs] = await Promise.all([
        renderClient.getService(serviceId),
        renderClient.getServiceLogs(serviceId, Math.min(limit * 2, 1000)), // Get more logs for filtering
      ]);

      // Parse and filter logs
      let filteredLogs = logs;

      // Apply level filter
      if (filterLevel) {
        filteredLogs = filteredLogs.filter(log => 
          log.toLowerCase().includes(filterLevel.toLowerCase())
        );
      }

      // Apply search filter
      if (search) {
        filteredLogs = filteredLogs.filter(log => 
          log.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Limit results
      filteredLogs = filteredLogs.slice(0, limit);

      // Analyze logs for patterns
      const analysis = {
        errorCount: logs.filter(log => 
          /error|exception|failed|fatal/i.test(log)
        ).length,
        warningCount: logs.filter(log => 
          /warn|warning|deprecated/i.test(log)
        ).length,
        totalLines: logs.length,
        filteredLines: filteredLogs.length,
      };

      // Extract common error patterns
      const errorPatterns = logs
        .filter(log => /error|exception|failed/i.test(log))
        .map(log => {
          // Extract common error types
          const patterns = [
            /Error: ([^\\n]+)/i,
            /Exception: ([^\\n]+)/i,
            /Failed to ([^\\n]+)/i,
            /Cannot ([^\\n]+)/i,
            /Unable to ([^\\n]+)/i,
          ];
          
          for (const pattern of patterns) {
            const match = log.match(pattern);
            if (match) {
              return match[1].trim();
            }
          }
          
          return log.substring(0, 100) + (log.length > 100 ? '...' : '');
        })
        .filter((error, index, arr) => arr.indexOf(error) === index) // Remove duplicates
        .slice(0, 5); // Top 5 unique errors

      const result = {
        service: {
          id: service.id,
          name: service.name,
          type: service.type,
        },
        logs: {
          entries: filteredLogs,
          analysis,
          filters: {
            level: filterLevel || 'none',
            search: search || 'none',
            applied: !!(filterLevel || search),
          },
        },
        insights: {
          hasErrors: analysis.errorCount > 0,
          hasWarnings: analysis.warningCount > 0,
          commonErrors: errorPatterns,
          healthStatus: analysis.errorCount === 0 ? 'healthy' : 
                      analysis.errorCount < 5 ? 'minor_issues' : 'concerning',
        },
        recommendations: [] as string[],
      };

      // Add recommendations based on log analysis
      if (analysis.errorCount > 10) {
        result.recommendations.push('High error count detected - investigate application issues');
      }
      
      if (analysis.warningCount > 20) {
        result.recommendations.push('Many warnings detected - consider addressing deprecated features');
      }
      
      if (errorPatterns.length > 0) {
        result.recommendations.push(`Common error patterns found: ${errorPatterns[0]}`);
      }
      
      if (filteredLogs.length === 0 && logs.length > 0) {
        result.recommendations.push('No logs match your filters - try broadening search criteria');
      }

      logger.info(`Retrieved ${filteredLogs.length} log entries for service ${service.name}`);
      return result;
    } catch (error) {
      logger.error(`Failed to get logs for service ${serviceId}:`, error);
      throw error;
    }
  },
};