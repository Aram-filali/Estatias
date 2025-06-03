// utils/retry.util.ts
import { Logger } from '@nestjs/common';

export async function intelligentRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      timeoutMs?: number;
      logger?: Logger;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, timeoutMs = 30000, logger } = options;
    let lastError: Error = new Error('Retry failed');
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
          )
        ]);
        return result;
      } catch (error) {
        lastError = error as Error;
        const waitTime = Math.min(2000 * Math.pow(2, i), 30000);
        
        logger?.warn(`Tentative ${i + 1} échouée - Nouvel essai dans ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw lastError;
  }
  
