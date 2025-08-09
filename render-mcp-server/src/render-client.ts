/**
 * Render API Client
 * 
 * Provides a typed interface to the Render.com REST API
 * for managing services, deployments, and environment variables.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { z } from 'zod';
import winston from 'winston';

// Zod schemas for API validation based on actual Render API response
export const ServiceSchema = z.object({
  autoDeploy: z.enum(['yes', 'no']),
  autoDeployTrigger: z.string().optional(),
  branch: z.string().optional(),
  createdAt: z.string(),
  dashboardUrl: z.string().optional(),
  id: z.string(),
  name: z.string(),
  notifyOnFail: z.string().optional(),
  ownerId: z.string(),
  repo: z.string().optional(),
  rootDir: z.string().optional(),
  serviceDetails: z.object({
    buildPlan: z.string().optional(),
    env: z.enum(['docker', 'elixir', 'go', 'node', 'python', 'ruby', 'rust', 'static']),
    envSpecificDetails: z.object({
      buildCommand: z.string().optional(),
      startCommand: z.string().optional(),
      dockerCommand: z.string().optional(),
      dockerContext: z.string().optional(),
      dockerfilePath: z.string().optional(),
    }).optional(),
    healthCheckPath: z.string().optional(),
    maintenanceMode: z.object({
      enabled: z.boolean(),
      uri: z.string().optional(),
    }).optional(),
    numInstances: z.number().optional(),
    openPorts: z.array(z.object({
      port: z.number(),
      protocol: z.string(),
    })).optional(),
    plan: z.string(),
    previews: z.object({
      generation: z.string(),
    }).optional(),
    pullRequestPreviewsEnabled: z.enum(['yes', 'no']).optional(),
    region: z.string(),
    runtime: z.string().optional(),
    sshAddress: z.string().optional(),
    url: z.string().optional(),
  }),
  slug: z.string(),
  suspended: z.enum(['suspended', 'not_suspended']),
  suspenders: z.array(z.string()),
  type: z.enum(['web_service', 'private_service', 'background_worker', 'cron_job']),
  updatedAt: z.string(),
});

export const DeploymentSchema = z.object({
  id: z.string(),
  commit: z.object({
    id: z.string(),
    message: z.string(),
    createdAt: z.string(),
  }),
  status: z.enum(['created', 'build_in_progress', 'update_in_progress', 'live', 'deactivated', 'build_failed', 'update_failed', 'canceled']),
  finishedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const EnvVarSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export type Service = z.infer<typeof ServiceSchema>;
export type Deployment = z.infer<typeof DeploymentSchema>;
export type EnvVar = z.infer<typeof EnvVarSchema>;

export interface RenderClientConfig {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
}

export class RenderClient {
  private client: AxiosInstance;
  private logger: winston.Logger;

  constructor(config: RenderClientConfig = {}) {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [new winston.transports.Console()]
    });

    const apiKey = config.apiKey || process.env.RENDER_API_KEY;
    if (!apiKey) {
      throw new Error('RENDER_API_KEY environment variable is required');
    }

    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.render.com/v1',
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use((config) => {
      this.logger.debug(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`, {
          error: error.response?.data || error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Validate API connection
   */
  async validateConnection(): Promise<void> {
    try {
      await this.client.get('/services?limit=1');
      this.logger.info('✅ Render API connection validated successfully');
    } catch (error) {
      this.logger.error('❌ Failed to validate Render API connection:', error);
      throw new Error('Invalid Render API configuration');
    }
  }

  /**
   * Get all services
   */
  async getServices(): Promise<Service[]> {
    try {
      const response = await this.client.get('/services');
      // The Render API returns an array of objects with cursor and service properties
      const services = response.data.map((item: any) => item.service || item);
      return services.map((service: any) => ServiceSchema.parse(service));
    } catch (error) {
      this.logger.error('Failed to fetch services:', error);
      throw error;
    }
  }

  /**
   * Get a specific service by ID
   */
  async getService(serviceId: string): Promise<Service> {
    try {
      const response = await this.client.get(`/services/${serviceId}`);
      return ServiceSchema.parse(response.data);
    } catch (error) {
      this.logger.error(`Failed to fetch service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get deployments for a service
   */
  async getDeployments(serviceId: string, limit: number = 10): Promise<Deployment[]> {
    try {
      const response = await this.client.get(`/services/${serviceId}/deploys?limit=${limit}`);
      return response.data.map((deployment: any) => DeploymentSchema.parse(deployment));
    } catch (error) {
      this.logger.error(`Failed to fetch deployments for service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get environment variables for a service
   */
  async getEnvVars(serviceId: string): Promise<EnvVar[]> {
    try {
      const response = await this.client.get(`/services/${serviceId}/env-vars`);
      return response.data.map((envVar: any) => EnvVarSchema.parse(envVar));
    } catch (error) {
      this.logger.error(`Failed to fetch environment variables for service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Update environment variables for a service
   */
  async updateEnvVars(serviceId: string, envVars: EnvVar[]): Promise<void> {
    try {
      await this.client.put(`/services/${serviceId}/env-vars`, envVars);
      this.logger.info(`✅ Updated environment variables for service ${serviceId}`);
    } catch (error) {
      this.logger.error(`Failed to update environment variables for service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Trigger a deployment for a service
   */
  async triggerDeployment(serviceId: string, clearCache: boolean = false): Promise<Deployment> {
    try {
      const response = await this.client.post(`/services/${serviceId}/deploys`, {
        clearCache
      });
      const deployment = DeploymentSchema.parse(response.data);
      this.logger.info(`🚀 Triggered deployment ${deployment.id} for service ${serviceId}`);
      return deployment;
    } catch (error) {
      this.logger.error(`Failed to trigger deployment for service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a deployment
   */
  async cancelDeployment(serviceId: string, deploymentId: string): Promise<void> {
    try {
      await this.client.post(`/services/${serviceId}/deploys/${deploymentId}/cancel`);
      this.logger.info(`🛑 Cancelled deployment ${deploymentId} for service ${serviceId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel deployment ${deploymentId} for service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Suspend a service
   */
  async suspendService(serviceId: string): Promise<void> {
    try {
      await this.client.post(`/services/${serviceId}/suspend`);
      this.logger.info(`⏸️ Suspended service ${serviceId}`);
    } catch (error) {
      this.logger.error(`Failed to suspend service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Resume a service
   */
  async resumeService(serviceId: string): Promise<void> {
    try {
      await this.client.post(`/services/${serviceId}/resume`);
      this.logger.info(`▶️ Resumed service ${serviceId}`);
    } catch (error) {
      this.logger.error(`Failed to resume service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get service logs
   */
  async getServiceLogs(serviceId: string, limit: number = 100): Promise<string[]> {
    try {
      const response = await this.client.get(`/services/${serviceId}/logs?limit=${limit}`);
      return response.data.logs || [];
    } catch (error) {
      this.logger.error(`Failed to fetch logs for service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Check service health
   */
  async checkServiceHealth(serviceId: string): Promise<{ status: string; message: string }> {
    try {
      const service = await this.getService(serviceId);
      const deployments = await this.getDeployments(serviceId, 1);
      
      const latestDeployment = deployments[0];
      if (!latestDeployment) {
        return { status: 'unknown', message: 'No deployments found' };
      }

      switch (latestDeployment.status) {
        case 'live':
          return { status: 'healthy', message: 'Service is running and healthy' };
        case 'build_in_progress':
        case 'update_in_progress':
          return { status: 'deploying', message: 'Deployment in progress' };
        case 'build_failed':
        case 'update_failed':
          return { status: 'failed', message: 'Latest deployment failed' };
        case 'canceled':
          return { status: 'canceled', message: 'Latest deployment was canceled' };
        default:
          return { status: 'unknown', message: `Unknown status: ${latestDeployment.status}` };
      }
    } catch (error) {
      this.logger.error(`Failed to check health for service ${serviceId}:`, error);
      return { status: 'error', message: 'Failed to check service health' };
    }
  }
}