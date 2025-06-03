export interface ExternalApiResponse {
    success: boolean;
    data?: any;
    error?: string;
  }
  
  export interface CaptchaSolverResponse {
    success: boolean;
    solution?: string;
    error?: string;
  }
  
  export interface CalendarPlatformConfig {
    baseUrl: string;
    apiKey?: string;
    searchEndpoint: string;
    calendarEndpoint: string;
    authRequired: boolean;
  }