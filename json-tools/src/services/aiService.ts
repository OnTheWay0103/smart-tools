export interface AIFixSuggestion {
  fixed: string;
  explanation: string;
  confidence: number;
}

export interface AIStructureSuggestion {
  suggestion: string;
  explanation: string;
  improvements: string[];
}

export class AIService {
  private static readonly API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  private static readonly API_URL = 'https://api.openai.com/v1/chat/completions';

  static async fixJSONSyntax(jsonString: string, errorMessage: string): Promise<AIFixSuggestion> {
    const prompt = `Fix this JSON syntax error:

Error: ${errorMessage}

JSON:
${jsonString}

Return valid JSON without changing the data structure. Provide a brief explanation.`;

    try {
      const response = await this.callOpenAI(prompt);
      const lines = response.split('\n');
      const fixedJson = lines.find(line => 
        line.trim().startsWith('{') || line.trim().startsWith('[')
      ) || jsonString;
      
      return {
        fixed: fixedJson,
        explanation: lines.filter(line => 
          !line.trim().startsWith('{') && !line.trim().startsWith('[') 
          && line.trim().length > 0
        ).join(' ') || 'Fixed JSON syntax error',
        confidence: 0.8
      };
    } catch (error) {
      return {
        fixed: jsonString,
        explanation: 'AI fix unavailable',
        confidence: 0
      };
    }
  }

  static async suggestStructure(jsonString: string): Promise<AIStructureSuggestion> {
    const prompt = `Analyze this JSON structure and suggest improvements:

${jsonString}

Focus on:
1. Naming conventions
2. Data organization
3. Redundancy elimination
4. Performance optimization
5. Best practices

Provide specific, actionable suggestions.`;

    try {
      const response = await this.callOpenAI(prompt);
      
      return {
        suggestion: 'Consider these structural improvements',
        explanation: response,
        improvements: response.split('\n')
          .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
          .map(line => line.replace(/^[-•]\s*/, ''))
      };
    } catch (error) {
      return {
        suggestion: 'Analysis unavailable',
        explanation: 'AI suggestions temporarily unavailable',
        improvements: []
      };
    }
  }

  private static async callOpenAI(prompt: string): Promise<string> {
    if (!this.API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a JSON expert. Provide concise, practical suggestions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API error');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response';
  }
}