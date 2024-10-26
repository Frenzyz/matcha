import { CreateMLCEngine, MLCEngine } from '@mlc-ai/web-llm';

class WebLLMService {
  private engine: MLCEngine | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize(progressCallback?: (progress: any) => void) {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise(async (resolve, reject) => {
      try {
        this.engine = await CreateMLCEngine(
          "TinyLlama-1.1B-Chat-v1.0-q4f32_1",
          { 
            initProgressCallback: progressCallback,
            required_features: ["shader-f16"],
            modelBaseUrl: "https://huggingface.co/mlc-ai/mlc-chat-TinyLlama-1.1B-Chat-v1.0-q4f32_1/resolve/main/",
            wasmUrl: "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.73/dist/"
          }
        );

        await this.setSystemPrompt();
        resolve();
      } catch (error) {
        this.initPromise = null;
        reject(error);
      }
    });

    return this.initPromise;
  }

  private async setSystemPrompt() {
    if (!this.engine) throw new Error('Engine not initialized');
    
    await this.engine.chat.completions.create({
      messages: [{
        role: "system",
        content: `You are an AI academic assistant for UNCC students. You help with:
                 - Course planning and scheduling
                 - Assignment tracking and reminders
                 - Study tips and resources
                 - Campus event recommendations
                 Always be helpful, accurate, and encouraging.`
      }]
    });
  }

  async generate(prompt: string): Promise<string> {
    if (!this.engine) throw new Error('Engine not initialized');
    
    const response = await this.engine.chat.completions.create({
      messages: [{
        role: "user",
        content: prompt
      }],
      temperature: 0.7,
      max_tokens: 500,
      top_p: 0.95
    });

    return response.choices[0].message.content;
  }

  async generateStream(prompt: string, onChunk: (text: string) => void): Promise<void> {
    if (!this.engine) throw new Error('Engine not initialized');
    
    const chunks = await this.engine.chat.completions.create({
      messages: [{
        role: "user",
        content: prompt
      }],
      temperature: 0.7,
      max_tokens: 500,
      top_p: 0.95,
      stream: true
    });

    for await (const chunk of chunks) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
    }
  }

  async reset() {
    if (!this.engine) throw new Error('Engine not initialized');
    await this.engine.resetChat();
    await this.setSystemPrompt();
  }

  unload() {
    if (this.engine) {
      this.engine = null;
      this.initPromise = null;
    }
  }
}

export const webLLMService = new WebLLMService();