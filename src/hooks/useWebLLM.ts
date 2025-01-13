import { useState, useEffect, useCallback } from 'react';
import { webLLMService } from '../services/webllm';

interface InitProgress {
  step: number;
  message: string;
}

export function useWebLLM() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initProgress, setInitProgress] = useState<InitProgress | null>(null);

  useEffect(() => {
    const initWebLLM = async () => {
      try {
        await webLLMService.initialize((progress) => {
          setInitProgress({
            step: Math.round(progress.progress * 100),
            message: progress.text
          });
        });
        setInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize AI assistant');
      }
    };

    initWebLLM();

    return () => {
      webLLMService.unload();
    };
  }, []);

  const generateResponse = useCallback(async (prompt: string): Promise<string> => {
    if (!initialized) {
      throw new Error('AI assistant not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await webLLMService.generate(prompt);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate response';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  const generateStreamResponse = useCallback(async (prompt: string, onChunk: (text: string) => void): Promise<void> => {
    if (!initialized) {
      throw new Error('AI assistant not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      await webLLMService.generateStream(prompt, onChunk);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate response';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  const resetChat = useCallback(async () => {
    if (!initialized) {
      throw new Error('AI assistant not initialized');
    }

    try {
      await webLLMService.reset();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset chat';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [initialized]);

  return {
    generateResponse,
    generateStreamResponse,
    resetChat,
    loading,
    error,
    initialized,
    initProgress
  };
}
