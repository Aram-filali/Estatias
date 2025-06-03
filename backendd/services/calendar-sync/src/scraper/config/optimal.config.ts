// config/optimal.config.ts
export const OPTIMAL_CONFIG = {
    stealth: {
      // https://github.com/berstend/puppeteer-extra/tree/master/packages/plugin-stealth
      enabled: true,
      options: {
        hideWebDriver: true,
        mockChrome: true,
        mockDeviceMetrics: true,
        customWebGL: true
      }
    },
    proxy: {
      rotationInterval: 30, // minutes
      minSuccessRate: 0.7,
      residentialOnly: true
    },
    scraping: {
      maxConcurrency: 3,
      requestDelay: {
        min: 1000,
        max: 5000
      }
    }
  };