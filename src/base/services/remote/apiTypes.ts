export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: any;
  };
  success: false;
}

export interface RequestConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userId?: number;
}

// Enhanced error types matching iOS implementation
export interface ValidationError {
  key: string;
  messages: string[];
}

export type ErrorType =
  // Network errors
  | 'SERVER_NOT_RESPONDING'
  | 'SERVER_NOT_FOUND'
  | 'REQUEST_TIMED_OUT'
  | 'NO_INTERNET'
  // Application errors
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'DEFAULTS_NOT_LOADED'
  | 'SERVER_ERROR'
  | 'ENCODE_FAILED'
  | 'DECODE_FAILED'
  // Backend errors
  | 'CUSTOM'
  // Unknown
  | 'UNKNOWN';

export interface NetworkError {
  type: ErrorType;
  message: string;
  code?: string;
  statusCode?: number;
  timestamp?: string;
  errors?: ValidationError[];
  fullMessage?: string;
}

// Error DTO structure matching iOS
export interface ErrorDto {
  code?: string;
  status?: string;
  message?: string;
  timestamp?: string;
  errors?: Record<string, string[]>;
}

