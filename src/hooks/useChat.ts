import { useState, useCallback } from 'react';
import { llmService } from '../services/llm';

export function useChat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateResponse = useCallback(async (prompt: string): Promise<string> => {
    if (!prompt.trim()) {
      setError('Please enter a message');
      return '';
    }

    setLoading(true);
    setError(null);

    try {
      const response = await llmService.generate(prompt);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate response';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateStreamResponse = useCallback(async (
    prompt: string,
    onChunk: (text: string) => void
  ): Promise<void> => {
    if (!prompt.trim()) {
      setError('Please enter a message');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await llmService.generateStream(prompt, onChunk);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate response';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generateResponse,
    generateStreamResponse,
    clearError,
    loading,
    error
  };
}
