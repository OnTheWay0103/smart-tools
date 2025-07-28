export interface JSONProcessingOptions {
  indent: number;
  sortKeys: boolean;
  removeWhitespace: boolean;
}

export interface JSONValidationResult {
  valid: boolean;
  error?: string;
  line?: number;
  column?: number;
}

export interface JSONProcessingResult {
  formatted: string;
  minified: string;
  validation: JSONValidationResult;
  stats: {
    size: number;
    formattedSize: number;
    objects: number;
    arrays: number;
    primitives: number;
  };
}

export class JSONProcessor {
  static validate(jsonString: string): JSONValidationResult {
    try {
      JSON.parse(jsonString);
      return { valid: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON';
      
      // Parse error location
      const match = message.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1]);
        const lines = jsonString.substring(0, position).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        
        return {
          valid: false,
          error: message,
          line,
          column
        };
      }
      
      return {
        valid: false,
        error: message
      };
    }
  }

  static format(jsonString: string, options: JSONProcessingOptions): string {
    try {
      let parsed = JSON.parse(jsonString);
      
      if (options.sortKeys) {
        parsed = this.sortKeys(parsed);
      }
      
      return JSON.stringify(parsed, null, options.indent);
    } catch {
      return jsonString;
    }
  }

  static minify(jsonString: string): string {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed);
    } catch {
      return jsonString;
    }
  }

  static process(jsonString: string, options: JSONProcessingOptions): JSONProcessingResult {
    const validation = this.validate(jsonString);
    
    if (!validation.valid) {
      return {
        formatted: jsonString,
        minified: jsonString,
        validation,
        stats: { size: jsonString.length, formattedSize: jsonString.length, objects: 0, arrays: 0, primitives: 0 }
      };
    }

    const parsed = JSON.parse(jsonString);
    const formatted = options.removeWhitespace ? this.minify(jsonString) : this.format(jsonString, options);
    const minified = this.minify(jsonString);
    const stats = this.getStats(parsed);

    return {
      formatted,
      minified,
      validation,
      stats: {
        size: jsonString.length,
        formattedSize: formatted.length,
        ...stats
      }
    };
  }

  private static sortKeys(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(this.sortKeys);
    }
    
    if (obj !== null && typeof obj === 'object') {
      const sorted: any = {};
      Object.keys(obj).sort().forEach(key => {
        sorted[key] = this.sortKeys(obj[key]);
      });
      return sorted;
    }
    
    return obj;
  }

  private static getStats(obj: any): { objects: number; arrays: number; primitives: number } {
    let objects = 0;
    let arrays = 0;
    let primitives = 0;

    function count(item: any) {
      if (Array.isArray(item)) {
        arrays++;
        item.forEach(count);
      } else if (item !== null && typeof item === 'object') {
        objects++;
        Object.values(item).forEach(count);
      } else {
        primitives++;
      }
    }

    count(obj);
    return { objects, arrays, primitives };
  }

  static toXML(jsonString: string): string {
    try {
      const parsed = JSON.parse(jsonString);
      return this.convertToXML(parsed, 'root');
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  private static convertToXML(obj: any, nodeName: string, indent: string = ''): string {
    const nextIndent = indent + '  ';
    
    if (obj === null) {
      return `${indent}<${nodeName} xsi:nil="true" />`;
    }
    
    if (typeof obj === 'string') {
      const escaped = obj
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      return `${indent}<${nodeName}>${escaped}</${nodeName}>`;
    }
    
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return `${indent}<${nodeName}>${obj}</${nodeName}>`;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertToXML(item, nodeName, indent)).join('\n');
    }
    
    if (typeof obj === 'object') {
      const attrs: string[] = [];
      const children: string[] = [];
      
      Object.entries(obj).forEach(([key, value]) => {
        if (key.startsWith('@')) {
          attrs.push(`${key.slice(1)}="${value}"`);
        } else {
          children.push(this.convertToXML(value, key, nextIndent));
        }
      });
      
      const attrString = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
      
      if (children.length === 0) {
        return `${indent}<${nodeName}${attrString} />`;
      }
      
      return `${indent}<${nodeName}${attrString}>\n${children.join('\n')}\n${indent}</${nodeName}>`;
    }
    
    return `${indent}<${nodeName}>${String(obj)}</${nodeName}>`;
  }

  static compareJSON(json1: string, json2: string): { diff: string; hasDifferences: boolean } {
    try {
      const obj1 = JSON.parse(json1);
      const obj2 = JSON.parse(json2);
      
      const diff = this.generateDiff(obj1, obj2, '', 0);
      
      return {
        diff,
        hasDifferences: diff.includes('+ ') || diff.includes('- ')
      };
    } catch (error) {
      throw new Error('Invalid JSON format in one or both inputs');
    }
  }

  static validateSchema(jsonString: string, schemaString: string): { valid: boolean; errors: string[] } {
    try {
      const json = JSON.parse(jsonString);
      const schema = JSON.parse(schemaString);
      
      const errors: string[] = [];
      this.validateAgainstSchema(json, schema, '', errors);
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: ['Invalid JSON or Schema format']
      };
    }
  }

  private static validateAgainstSchema(data: any, schema: any, path: string, errors: string[]): void {
    // Basic JSON Schema validation
    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : data === null ? 'null' : typeof data;
      if (actualType !== schema.type) {
        errors.push(`${path}: Expected type ${schema.type}, got ${actualType}`);
        return;
      }
    }

    if (schema.properties && typeof data === 'object' && data !== null && !Array.isArray(data)) {
      Object.entries(schema.properties).forEach(([key, propSchema]: [string, any]) => {
        const newPath = path ? `${path}.${key}` : key;
        if (key in data) {
          this.validateAgainstSchema(data[key], propSchema, newPath, errors);
        } else if (propSchema.required) {
          errors.push(`${newPath}: Required property missing`);
        }
      });
    }

    if (schema.items && Array.isArray(data)) {
      data.forEach((item, index) => {
        this.validateAgainstSchema(item, schema.items, `${path}[${index}]`, errors);
      });
    }

    if (schema.required && typeof data === 'object' && data !== null && !Array.isArray(data)) {
      schema.required.forEach((key: string) => {
        if (!(key in data)) {
          errors.push(`${path}.${key}: Required property missing`);
        }
      });
    }

    if (schema.enum && Array.isArray(schema.enum)) {
      if (!schema.enum.includes(data)) {
        errors.push(`${path}: Value must be one of ${JSON.stringify(schema.enum)}`);
      }
    }

    if (schema.minimum !== undefined && typeof data === 'number') {
      if (data < schema.minimum) {
        errors.push(`${path}: Value must be >= ${schema.minimum}`);
      }
    }

    if (schema.maximum !== undefined && typeof data === 'number') {
      if (data > schema.maximum) {
        errors.push(`${path}: Value must be <= ${schema.maximum}`);
      }
    }

    if (schema.minLength !== undefined && typeof data === 'string') {
      if (data.length < schema.minLength) {
        errors.push(`${path}: String must be >= ${schema.minLength} characters`);
      }
    }

    if (schema.maxLength !== undefined && typeof data === 'string') {
      if (data.length > schema.maxLength) {
        errors.push(`${path}: String must be <= ${schema.maxLength} characters`);
      }
    }

    if (schema.minItems !== undefined && Array.isArray(data)) {
      if (data.length < schema.minItems) {
        errors.push(`${path}: Array must have >= ${schema.minItems} items`);
      }
    }

    if (schema.maxItems !== undefined && Array.isArray(data)) {
      if (data.length > schema.maxItems) {
        errors.push(`${path}: Array must have <= ${schema.maxItems} items`);
      }
    }
  }

  static queryJSON(jsonString: string, query: string): any[] {
    try {
      const parsed = JSON.parse(jsonString);
      return this.evaluateJSONPath(parsed, query);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  private static evaluateJSONPath(obj: any, query: string): any[] {
    // Simple JSONPath implementation
    const results: any[] = [];
    
    // Remove $ and leading dots from query
    const cleanQuery = query.replace(/^\$?\./, '');
    
    if (!cleanQuery) {
      return [obj];
    }
    
    // Handle array access
    const arrayMatch = cleanQuery.match(/^(.+?)\[(\d+|\*)\]$/);
    if (arrayMatch) {
      const [_, path, index] = arrayMatch;
      const parent = this.getValueAtPath(obj, path);
      
      if (Array.isArray(parent)) {
        if (index === '*') {
          return parent;
        } else {
          const idx = parseInt(index);
          if (idx >= 0 && idx < parent.length) {
            return [parent[idx]];
          }
        }
      }
    }
    
    // Handle dot notation
    return [this.getValueAtPath(obj, cleanQuery)];
  }

  private static getValueAtPath(obj: any, path: string): any {
    if (!path) return obj;
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      // Handle array indices
      if (key.match(/^\d+$/)) {
        const index = parseInt(key);
        if (Array.isArray(current) && index >= 0 && index < current.length) {
          current = current[index];
        } else {
          return undefined;
        }
      } else {
        current = current[key];
      }
    }
    
    return current;
  }

  private static generateDiff(obj1: any, obj2: any, path: string, indent: number): string {
    const spaces = '  '.repeat(indent);
    let diff = '';

    const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
    const sortedKeys = Array.from(keys).sort();

    for (const key of sortedKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        if (val1 === undefined) {
          // Added in obj2
          if (typeof val2 === 'object' && val2 !== null && !Array.isArray(val2)) {
            diff += `${spaces}+ "${key}": ${JSON.stringify(val2, null, 2).split('\n').join('\n' + spaces + '  ')}\n`;
          } else {
            diff += `${spaces}+ "${key}": ${JSON.stringify(val2)}\n`;
          }
        } else if (val2 === undefined) {
          // Removed from obj1
          if (typeof val1 === 'object' && val1 !== null && !Array.isArray(val1)) {
            diff += `${spaces}- "${key}": ${JSON.stringify(val1, null, 2).split('\n').join('\n' + spaces + '  ')}\n`;
          } else {
            diff += `${spaces}- "${key}": ${JSON.stringify(val1)}\n`;
          }
        } else if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
          // Both are objects, recurse
          diff += `${spaces}  "${key}": {\n`;
          diff += this.generateDiff(val1, val2, currentPath, indent + 1);
          diff += `${spaces}  }\n`;
        } else {
          // Modified
          if (typeof val1 === 'object' && val1 !== null) {
            diff += `${spaces}- "${key}": ${JSON.stringify(val1, null, 2).split('\n').join('\n' + spaces + '  ')}\n`;
          } else {
            diff += `${spaces}- "${key}": ${JSON.stringify(val1)}\n`;
          }
          if (typeof val2 === 'object' && val2 !== null) {
            diff += `${spaces}+ "${key}": ${JSON.stringify(val2, null, 2).split('\n').join('\n' + spaces + '  ')}\n`;
          } else {
            diff += `${spaces}+ "${key}": ${JSON.stringify(val2)}\n`;
          }
        }
      } else {
        // No change
        if (typeof val1 === 'object' && val1 !== null && !Array.isArray(val1)) {
          diff += `${spaces}  "${key}": {\n`;
          diff += this.generateDiff(val1, val2, currentPath, indent + 1);
          diff += `${spaces}  }\n`;
        } else {
          diff += `${spaces}  "${key}": ${JSON.stringify(val1)}\n`;
        }
      }
    }

    return diff;
  }
}