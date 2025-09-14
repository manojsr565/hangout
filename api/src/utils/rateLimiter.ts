interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  isAllowed(identifier: string): { allowed: boolean; resetTime?: number; remaining?: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // If no entry exists or the window has expired, create a new one
    if (!entry || now >= entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      this.requests.set(identifier, newEntry);
      
      return {
        allowed: true,
        resetTime: newEntry.resetTime,
        remaining: this.config.maxRequests - 1
      };
    }

    // Check if the request exceeds the limit
    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        resetTime: entry.resetTime,
        remaining: 0
      };
    }

    // Increment the count and allow the request
    entry.count++;
    this.requests.set(identifier, entry);

    return {
      allowed: true,
      resetTime: entry.resetTime,
      remaining: this.config.maxRequests - entry.count
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now >= entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  // Get current stats for monitoring
  getStats(): { totalEntries: number; activeEntries: number } {
    const now = Date.now();
    let activeEntries = 0;
    
    for (const entry of this.requests.values()) {
      if (now < entry.resetTime) {
        activeEntries++;
      }
    }

    return {
      totalEntries: this.requests.size,
      activeEntries
    };
  }

  // Clean up resources (useful for testing)
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.requests.clear();
  }
}

// Create rate limiter instances with different configurations
export const submitPlanRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10 // 10 requests per 15 minutes per IP
});

export const globalRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100 // 100 requests per minute globally
});

export { RateLimiter };