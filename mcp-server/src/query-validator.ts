import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ALLOWED_QUERY_NAMES, AllowedQueryName } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class QueryValidator {
  private queryCache = new Map<string, string>();

  /**
   * Validates that a SQL query contains only SELECT statements
   */
  static validateSelectOnly(query: string): boolean {
    // Remove comments and normalize whitespace
    const normalized = query
      .replace(/--.*$/gm, '') // Remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    // Check if query starts with 'with' (for CTEs) or 'select'
    const startsWithValidKeyword = normalized.startsWith('select') || normalized.startsWith('with');
    
    if (!startsWithValidKeyword) {
      return false;
    }

    // Check for dangerous SQL keywords that modify data
    const dangerousKeywords = [
      'insert', 'update', 'delete', 'drop', 'create', 'alter', 
      'truncate', 'replace', 'merge', 'grant', 'revoke',
      'exec', 'execute', 'call', 'declare', 'set'
    ];

    for (const keyword of dangerousKeywords) {
      // Use word boundaries to avoid false positives
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(normalized)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates that query name is in allowed list
   */
  static validateQueryName(name: string): name is AllowedQueryName {
    return ALLOWED_QUERY_NAMES.includes(name as AllowedQueryName);
  }

  /**
   * Load and cache a named query from the queries directory
   */
  async loadNamedQuery(name: string): Promise<string> {
    if (!QueryValidator.validateQueryName(name)) {
      throw new Error(`Invalid query name: ${name}. Allowed queries: ${ALLOWED_QUERY_NAMES.join(', ')}`);
    }

    // Check cache first
    if (this.queryCache.has(name)) {
      return this.queryCache.get(name)!;
    }

    try {
      const queryPath = join(__dirname, '..', 'queries', `${name}.sql`);
      const queryContent = await readFile(queryPath, 'utf-8');
      
      // Validate the loaded query
      if (!QueryValidator.validateSelectOnly(queryContent)) {
        throw new Error(`Query ${name} contains non-SELECT statements`);
      }

      // Cache the validated query
      this.queryCache.set(name, queryContent);
      return queryContent;
    } catch (error) {
      if (error instanceof Error && error.message.includes('non-SELECT')) {
        throw error;
      }
      throw new Error(`Failed to load query ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate and parse JSON parameters
   */
  static validateParams(paramsJson: string): any[] {
    try {
      const parsed = JSON.parse(paramsJson);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Parameters must be an array');
      }

      // Basic validation - no objects or functions
      for (const param of parsed) {
        if (typeof param === 'object' && param !== null) {
          throw new Error('Parameters cannot contain objects');
        }
        if (typeof param === 'function') {
          throw new Error('Parameters cannot contain functions');
        }
      }

      return parsed;
    } catch (error) {
      throw new Error(`Invalid JSON parameters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}