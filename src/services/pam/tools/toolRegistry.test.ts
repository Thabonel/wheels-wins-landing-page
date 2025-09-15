/**
 * Test suite for PAM Tool Registry
 * Validates tool definitions, JSON Schema compliance, and registry functionality
 */

import { describe, it, expect } from 'vitest';
import {
  PAM_TOOLS,
  TOOL_CATEGORIES,
  getToolsByCategory,
  getToolByName,
  getAllToolNames,
  validateToolDefinition,
  getToolsForClaude,
  getToolRegistryStats,
  type ToolDefinition,
  type ToolInputSchema
} from './toolRegistry';

describe('PAM Tool Registry', () => {
  describe('Tool Registry Structure', () => {
    it('should have at least 10 tools defined', () => {
      expect(PAM_TOOLS.length).toBeGreaterThanOrEqual(10);
    });

    it('should have all required categories defined', () => {
      const expectedCategories = ['financial', 'profile', 'calendar', 'trip', 'vehicle', 'settings'];
      
      expectedCategories.forEach(category => {
        expect(Object.keys(TOOL_CATEGORIES)).toContain(category);
      });
    });

    it('should have tools in each category', () => {
      const categoriesWithTools = [...new Set(PAM_TOOLS.map(tool => tool.category))];
      
      expect(categoriesWithTools.length).toBeGreaterThanOrEqual(5);
      expect(categoriesWithTools).toContain('financial');
      expect(categoriesWithTools).toContain('profile');
    });

    it('should have all required tools defined', () => {
      const requiredTools = [
        'getUserExpenses',
        'getUserProfile',
        'getUserBudgets',
        'getIncomeData',
        'getTripHistory',
        'getUpcomingEvents',
        'calculateSavings',
        'getVehicleData',
        'getFuelData',
        'getUserSettings'
      ];

      const toolNames = getAllToolNames();
      
      requiredTools.forEach(toolName => {
        expect(toolNames).toContain(toolName);
      });
    });
  });

  describe('Individual Tool Validation', () => {
    it('should validate all tools have required fields', () => {
      PAM_TOOLS.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('input_schema');
        expect(tool).toHaveProperty('category');
        
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.input_schema).toBe('object');
        expect(typeof tool.category).toBe('string');
        
        expect(tool.name.length).toBeGreaterThan(0);
        expect(tool.description.length).toBeGreaterThan(10);
      });
    });

    it('should validate all tool names are unique', () => {
      const toolNames = PAM_TOOLS.map(tool => tool.name);
      const uniqueNames = new Set(toolNames);
      
      expect(uniqueNames.size).toBe(toolNames.length);
    });

    it('should validate all tool categories are valid', () => {
      const validCategories = Object.keys(TOOL_CATEGORIES);
      
      PAM_TOOLS.forEach(tool => {
        expect(validCategories).toContain(tool.category);
      });
    });
  });

  describe('JSON Schema Validation', () => {
    it('should have valid JSON Schema structure for all tools', () => {
      PAM_TOOLS.forEach(tool => {
        const schema = tool.input_schema;
        
        // Basic schema structure
        expect(schema).toHaveProperty('type');
        expect(schema.type).toBe('object');
        expect(schema).toHaveProperty('properties');
        expect(typeof schema.properties).toBe('object');
        
        // Additional properties should be explicitly set
        expect(schema).toHaveProperty('additionalProperties');
        expect(schema.additionalProperties).toBe(false);
      });
    });

    it('should validate all property definitions are complete', () => {
      PAM_TOOLS.forEach(tool => {
        const properties = tool.input_schema.properties;
        
        Object.entries(properties).forEach(([propName, propDef]) => {
          expect(propDef).toHaveProperty('type');
          expect(propDef).toHaveProperty('description');
          
          expect(typeof propDef.type).toBe('string');
          expect(typeof propDef.description).toBe('string');
          expect(propDef.description.length).toBeGreaterThan(5);
          
          // Validate enum values if present
          if (propDef.enum) {
            expect(Array.isArray(propDef.enum)).toBe(true);
            expect(propDef.enum.length).toBeGreaterThan(0);
            propDef.enum.forEach(enumValue => {
              expect(typeof enumValue).toBe('string');
            });
          }
          
          // Validate numeric constraints if present
          if (propDef.minimum !== undefined) {
            expect(typeof propDef.minimum).toBe('number');
          }
          
          if (propDef.maximum !== undefined) {
            expect(typeof propDef.maximum).toBe('number');
          }
          
          // Validate format constraints
          if (propDef.format) {
            expect(typeof propDef.format).toBe('string');
            expect(['date', 'email', 'uri']).toContain(propDef.format);
          }
        });
      });
    });

    it('should validate required fields are subset of properties', () => {
      PAM_TOOLS.forEach(tool => {
        const schema = tool.input_schema;
        
        if (schema.required) {
          expect(Array.isArray(schema.required)).toBe(true);
          
          schema.required.forEach(requiredField => {
            expect(Object.keys(schema.properties)).toContain(requiredField);
          });
        }
      });
    });

    it('should validate date format properties have correct type', () => {
      PAM_TOOLS.forEach(tool => {
        const properties = tool.input_schema.properties;
        
        Object.entries(properties).forEach(([propName, propDef]) => {
          if (propDef.format === 'date') {
            expect(propDef.type).toBe('string');
          }
        });
      });
    });

    it('should validate numeric properties have reasonable constraints', () => {
      PAM_TOOLS.forEach(tool => {
        const properties = tool.input_schema.properties;
        
        Object.entries(properties).forEach(([propName, propDef]) => {
          if (propDef.type === 'number') {
            // If minimum is set, it should be reasonable
            if (propDef.minimum !== undefined) {
              expect(propDef.minimum).toBeGreaterThanOrEqual(0);
            }
            
            // If maximum is set, it should be greater than minimum
            if (propDef.minimum !== undefined && propDef.maximum !== undefined) {
              expect(propDef.maximum).toBeGreaterThan(propDef.minimum);
            }
          }
        });
      });
    });
  });

  describe('Specific Tool Tests', () => {
    describe('getUserExpenses', () => {
      const tool = getToolByName('getUserExpenses');
      
      it('should be defined with correct structure', () => {
        expect(tool).toBeDefined();
        expect(tool!.category).toBe('financial');
        expect(tool!.description).toContain('expense');
      });

      it('should have proper date parameters', () => {
        const props = tool!.input_schema.properties;
        
        expect(props.start_date).toBeDefined();
        expect(props.end_date).toBeDefined();
        expect(props.start_date.format).toBe('date');
        expect(props.end_date.format).toBe('date');
      });

      it('should have expense category enum', () => {
        const props = tool!.input_schema.properties;
        
        expect(props.category.enum).toBeDefined();
        expect(props.category.enum).toContain('food_dining');
        expect(props.category.enum).toContain('transportation');
        expect(props.category.enum).toContain('fuel');
      });
    });

    describe('getUserBudgets', () => {
      const tool = getToolByName('getUserBudgets');
      
      it('should be defined with correct structure', () => {
        expect(tool).toBeDefined();
        expect(tool!.category).toBe('financial');
        expect(tool!.description).toContain('budget');
      });

      it('should have budget category enum', () => {
        const props = tool!.input_schema.properties;
        
        expect(props.category.enum).toBeDefined();
        expect(props.category.enum).toContain('total_monthly');
      });
    });

    describe('getTripHistory', () => {
      const tool = getToolByName('getTripHistory');
      
      it('should be defined with correct structure', () => {
        expect(tool).toBeDefined();
        expect(tool!.category).toBe('trip');
        expect(tool!.description).toContain('trip');
      });

      it('should have trip type enum', () => {
        const props = tool!.input_schema.properties;
        
        expect(props.trip_type.enum).toBeDefined();
        expect(props.trip_type.enum).toContain('business');
        expect(props.trip_type.enum).toContain('personal');
        expect(props.trip_type.enum).toContain('all');
      });

      it('should have reasonable limit constraints', () => {
        const props = tool!.input_schema.properties;
        
        expect(props.limit.minimum).toBe(1);
        expect(props.limit.maximum).toBe(500);
      });
    });

    describe('getFuelData', () => {
      const tool = getToolByName('getFuelData');
      
      it('should be defined with correct structure', () => {
        expect(tool).toBeDefined();
        expect(tool!.category).toBe('vehicle');
        expect(tool!.description).toContain('fuel');
      });

      it('should have analysis type enum', () => {
        const props = tool!.input_schema.properties;
        
        expect(props.analysis_type.enum).toBeDefined();
        expect(props.analysis_type.enum).toContain('cost_summary');
        expect(props.analysis_type.enum).toContain('efficiency_trends');
        expect(props.analysis_type.enum).toContain('all');
      });
    });

    describe('getUserSettings', () => {
      const tool = getToolByName('getUserSettings');
      
      it('should be defined with correct structure', () => {
        expect(tool).toBeDefined();
        expect(tool!.category).toBe('settings');
        expect(tool!.description).toContain('settings');
      });

      it('should have settings category enum', () => {
        const props = tool!.input_schema.properties;
        
        expect(props.category.enum).toBeDefined();
        expect(props.category.enum).toContain('notifications');
        expect(props.category.enum).toContain('privacy');
        expect(props.category.enum).toContain('all');
      });
    });
  });

  describe('Utility Functions', () => {
    describe('getToolsByCategory', () => {
      it('should return tools for valid categories', () => {
        const financialTools = getToolsByCategory('financial');
        
        expect(Array.isArray(financialTools)).toBe(true);
        expect(financialTools.length).toBeGreaterThan(0);
        
        financialTools.forEach(tool => {
          expect(tool.category).toBe('financial');
        });
      });

      it('should return empty array for categories with no tools', () => {
        // This test would be relevant if we had categories without tools
        const allCategories = Object.keys(TOOL_CATEGORIES) as (keyof typeof TOOL_CATEGORIES)[];
        
        allCategories.forEach(category => {
          const tools = getToolsByCategory(category);
          expect(Array.isArray(tools)).toBe(true);
        });
      });
    });

    describe('getToolByName', () => {
      it('should return correct tool for valid names', () => {
        const tool = getToolByName('getUserExpenses');
        
        expect(tool).toBeDefined();
        expect(tool!.name).toBe('getUserExpenses');
      });

      it('should return undefined for invalid names', () => {
        const tool = getToolByName('nonExistentTool');
        
        expect(tool).toBeUndefined();
      });
    });

    describe('getAllToolNames', () => {
      it('should return all tool names', () => {
        const names = getAllToolNames();
        
        expect(Array.isArray(names)).toBe(true);
        expect(names.length).toBe(PAM_TOOLS.length);
        expect(names).toContain('getUserExpenses');
        expect(names).toContain('getUserProfile');
      });
    });

    describe('validateToolDefinition', () => {
      it('should validate correct tool definitions', () => {
        PAM_TOOLS.forEach(tool => {
          expect(validateToolDefinition(tool)).toBe(true);
        });
      });

      it('should reject invalid tool definitions', () => {
        const invalidTool = {
          name: '',  // Invalid: empty name
          description: 'Test',
          category: 'financial',
          input_schema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        } as ToolDefinition;
        
        expect(validateToolDefinition(invalidTool)).toBe(false);
      });

      it('should reject tools with invalid categories', () => {
        const invalidTool = {
          name: 'test',
          description: 'Test description',
          category: 'invalid_category' as any,
          input_schema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        } as ToolDefinition;
        
        expect(validateToolDefinition(invalidTool)).toBe(false);
      });
    });

    describe('getToolsForClaude', () => {
      it('should return tools in Claude API format', () => {
        const claudeTools = getToolsForClaude();
        
        expect(Array.isArray(claudeTools)).toBe(true);
        expect(claudeTools.length).toBe(PAM_TOOLS.length);
        
        claudeTools.forEach(tool => {
          expect(tool).toHaveProperty('name');
          expect(tool).toHaveProperty('description');
          expect(tool).toHaveProperty('input_schema');
          
          // Should not have category or examples (Claude-specific format)
          expect(tool).not.toHaveProperty('category');
          expect(tool).not.toHaveProperty('examples');
        });
      });
    });

    describe('getToolRegistryStats', () => {
      it('should return accurate statistics', () => {
        const stats = getToolRegistryStats();
        
        expect(stats).toHaveProperty('total_tools');
        expect(stats).toHaveProperty('by_category');
        expect(stats).toHaveProperty('validation_status');
        
        expect(stats.total_tools).toBe(PAM_TOOLS.length);
        expect(stats.validation_status.valid).toBeGreaterThan(0);
        expect(stats.validation_status.invalid).toBe(0); // All should be valid
        
        // Check category counts
        const financialCount = getToolsByCategory('financial').length;
        expect(stats.by_category.financial).toBe(financialCount);
      });
    });
  });

  describe('Tool Examples', () => {
    it('should have examples for tools where provided', () => {
      PAM_TOOLS.forEach(tool => {
        if (tool.examples) {
          expect(Array.isArray(tool.examples)).toBe(true);
          expect(tool.examples.length).toBeGreaterThan(0);
          
          tool.examples.forEach(example => {
            expect(typeof example).toBe('string');
            expect(example.length).toBeGreaterThan(5);
          });
        }
      });
    });
  });

  describe('Tool Description Quality', () => {
    it('should have descriptive and helpful tool descriptions', () => {
      PAM_TOOLS.forEach(tool => {
        // Descriptions should be at least 20 characters and contain key info
        expect(tool.description.length).toBeGreaterThan(20);
        
        // Should contain the tool name or related keywords
        const toolKeywords = tool.name.toLowerCase().replace(/([A-Z])/g, ' $1').split(/\s+/);
        const description = tool.description.toLowerCase();
        
        // At least one keyword should appear in description
        const hasKeyword = toolKeywords.some(keyword => 
          keyword.length > 3 && description.includes(keyword)
        );
        expect(hasKeyword).toBe(true);
      });
    });

    it('should have clear parameter descriptions', () => {
      PAM_TOOLS.forEach(tool => {
        const properties = tool.input_schema.properties;
        
        Object.entries(properties).forEach(([paramName, paramDef]) => {
          expect(paramDef.description.length).toBeGreaterThan(10);
          expect(paramDef.description).not.toBe(paramName);
        });
      });
    });
  });
});