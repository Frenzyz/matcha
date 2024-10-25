import { useState, useCallback } from 'react';

const OLLAMA_URL = 'http://localhost:11434/api/generate';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export const useOllama = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateResponse = useCallback(async (prompt: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama2',
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to Ollama API');
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate response');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { generateResponse, isLoading, error };
};