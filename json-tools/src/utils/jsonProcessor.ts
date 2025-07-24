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
      const parsed = JSON.parse(jsonString);
      
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
    const formatted = this.format(jsonString, options);
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
}