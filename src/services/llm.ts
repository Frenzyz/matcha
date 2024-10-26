import { ChatCompletionMessage, ChatCompletionResponse } from './types';

export class LLMService {
  private baseUrl: string = 'http://cci-llm.charlotte.edu/api/v1';
  private apiKey: string = 'OnuR-l5IlfYqF8HYoTOYHAcHOXCgL5xASQM5ooGHG6A';
  private model: string = 'Llama-2-70B';

  private async makeRequest(messages: ChatCompletionMessage[]): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: 300,
          temperature: 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as ChatCompletionResponse;
      
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from LLM service');
      }

      return data.choices[0].message.content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`LLM service error: ${error.message}`);
      }
      throw new Error('An unexpected error occurred while communicating with the LLM service');
    }
  }

  async generate(prompt: string): Promise<string> {
    if (!prompt.trim()) {
      throw new Error('Prompt cannot be empty');
    }

    const messages: ChatCompletionMessage[] = [
      {
        role: 'system',
        content: `You are an AI academic assistant for UNCC students. You help with:
                 - Course planning and scheduling
                 - Assignment tracking and reminders
                 - Study tips and resources
                 - Campus event recommendations
                 Always be helpful, accurate, and encouraging.`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return this.makeRequest(messages);
  }

  async generateStream(prompt: string, onChunk: (text: string) => void): Promise<void> {
    if (!prompt.trim()) {
      throw new Error('Prompt cannot be empty');
    }

    try {
      const response = await this.generate(prompt);
      
      if (!response) {
        throw new Error('Empty response from LLM service');
      }

      // Simulate streaming by splitting the response into words
      const words = response.split(' ');
      
      for (const word of words) {
        onChunk(word + ' ');
        // Add a small delay between words to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Stream generation error: ${error.message}`);
      }
      throw new Error('An unexpected error occurred during stream generation');
    }
  }

  async reset(): Promise<void> {
    // No state to reset with this implementation
    return Promise.resolve();
  }
}

export const llmService = new LLMService();