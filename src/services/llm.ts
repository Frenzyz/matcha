import Groq from 'groq-sdk';
import { ChatCompletionMessage, ChatCompletionResponse } from './types';

export class LLMService {
  private groq: Groq;
  private model: string = 'llama3-8b-8192';

  constructor() {
    this.groq = new Groq({
      apiKey: import.meta.env.VITE_GROQ_API_KEY,
      dangerouslyAllowBrowser: true
    });
  }

  private async makeRequest(messages: ChatCompletionMessage[]): Promise<string> {
    try {
      const response = await this.groq.chat.completions.create({
        messages,
        model: this.model,
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.95
      });

      if (!response.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from Groq service');
      }

      return response.choices[0].message.content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Groq service error: ${error.message}`);
      }
      throw new Error('An unexpected error occurred while communicating with the Groq service');
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
                 - Library services and policies
                 - EPIC Affiliates Program information
                 - CHHS department programs and opportunities

                 Library Information:
                 - Located in Atkins Library with 11 floors
                 - Houses study rooms, classrooms, resources centers, help desks
                 - Community hours: M-F 7:30am-10pm, Sat 10am-10pm, Sun 11am-7pm
                 - UNC Charlotte ID required 7pm-7:30am
                 - No limit on item checkouts for university patrons
                 - Book returns at Info Desk or various campus drop locations
                 - Renewals available online or at Info Desk

                 EPIC Affiliates Program:
                 - Industry-academic partnership for energy workforce development
                 - Connects industry members with research faculty and students
                 - Focuses on electrical, computer, civil, environmental, mechanical engineering
                 - Provides internship and recruitment opportunities

                 CHHS Department:
                 - Offers programs in Exercise Science, Respiratory Therapy, Kinesiology
                 - Prepares students for careers in health services
                 - Strong focus on student success and career preparation
                 - Provides pathways to graduate education
                 
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
        throw new Error('Empty response from Groq service');
      }

      const words = response.split(' ');
      
      for (const word of words) {
        onChunk(word + ' ');
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
    return Promise.resolve();
  }
}

export const llmService = new LLMService();