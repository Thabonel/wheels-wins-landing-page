// Mobile-First Response Payload Optimizer
export interface OptimizedPayload<T> {
  data: T;
  size: number;
  compressed: boolean;
  partial: boolean;
}

export interface PaginationConfig {
  page: number;
  limit: number;
  total?: number;
}

export interface CompressionConfig {
  enabled: boolean;
  threshold: number; // bytes
  algorithm: 'gzip' | 'deflate';
}

export class MobileOptimizer {
  private static readonly MOBILE_PAYLOAD_LIMIT = 50 * 1024; // 50KB for mobile
  private static readonly MOBILE_BATCH_SIZE = 10;

  static compressPayload<T>(data: T, config: CompressionConfig): OptimizedPayload<T> {
    const jsonString = JSON.stringify(data);
    const size = new Blob([jsonString]).size;

    if (!config.enabled || size < config.threshold) {
      return {
        data,
        size,
        compressed: false,
        partial: false
      };
    }

    // Simulate compression for mobile
    const compressedData = this.removeNonEssentialFields(data);
    const compressedSize = new Blob([JSON.stringify(compressedData)]).size;

    return {
      data: compressedData,
      size: compressedSize,
      compressed: true,
      partial: size > this.MOBILE_PAYLOAD_LIMIT
    };
  }

  static paginateForMobile<T>(
    data: T[], 
    pagination: PaginationConfig
  ): { items: T[]; hasMore: boolean; nextPage: number } {
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    const items = data.slice(start, end);
    
    return {
      items,
      hasMore: end < data.length,
      nextPage: pagination.page + 1
    };
  }

  static selectiveFields<T extends Record<string, any>>(
    data: T,
    essentialFields: (keyof T)[],
    isMobile: boolean = false
  ): Partial<T> {
    if (!isMobile) return data;

    const result: Partial<T> = {};
    essentialFields.forEach(field => {
      if (data[field] !== undefined) {
        result[field] = data[field];
      }
    });

    return result;
  }

  private static removeNonEssentialFields<T>(data: T): T {
    if (typeof data !== 'object' || data === null) return data;
    
    if (Array.isArray(data)) {
      return data.map(item => this.removeNonEssentialFields(item)) as T;
    }

    const compressed = { ...data as any };
    
    // Remove common non-essential fields for mobile
    const nonEssentialFields = [
      'created_at', 'updated_at', 'metadata', 'debug_info', 
      'full_description', 'extended_data', 'analytics'
    ];

    nonEssentialFields.forEach(field => {
      if (field in compressed) {
        delete compressed[field];
      }
    });

    return compressed;
  }

  static estimateDataUsage(payload: any): { size: number; impact: 'low' | 'medium' | 'high' } {
    const size = new Blob([JSON.stringify(payload)]).size;
    
    let impact: 'low' | 'medium' | 'high' = 'low';
    if (size > 100 * 1024) impact = 'high';
    else if (size > 25 * 1024) impact = 'medium';

    return { size, impact };
  }
}