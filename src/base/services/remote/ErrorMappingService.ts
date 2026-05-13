/**
 * ErrorMappingService - Centralized error mapping for all repositories
 * Converts API errors to user-friendly messages
 */

export interface ErrorContext {
  feature?: 'auth' | 'user' | 'payment' | 'generic' | 'profile';
  operation?: 'login' | 'register' | 'verify' | 'resend' | 'fetch' | 'create' | 'update' | 'delete' | 'verifyLogin' | 'refresh';
}

/**
 * Centralized error mapping service
 * Used by all repositories to provide consistent error messages
 */
export class ErrorMappingService {
  /**
   * Map any error to a user-friendly message with context
   * @param error The error object from API/network
   * @param context Optional context for more specific messages
   * @returns User-friendly error message
   */
  static mapError(error: any, context: ErrorContext = {}): string {
    console.log('ErrorMappingService: Mapping error for', context);

    // Handle Error instances first
    if (error instanceof Error) {
      return error.message;
    }

    // Handle HTTP response errors
    if (error?.response) {
      const status = error.response.status;
      const message = error.response.data?.message;

      switch (status) {
        case 400:
          return message || this.getBadRequestMessage(context);

        case 401:
          return this.getUnauthorizedMessage(context);

        case 403:
          return this.getForbiddenMessage(context);

        case 404:
          return this.getNotFoundMessage(context);

        case 422:
          return message || this.getValidationMessage(context);

        case 429:
          return this.getRateLimitMessage(context);

        case 500:
          return 'Server error. Please try again later.';

        default:
          return message || `Request failed with status ${status}`;
      }
    }

    // Handle network errors
    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network')) {
      return 'Network error. Please check your internet connection.';
    }

    if (error?.code === 'TIMEOUT_ERROR' || error?.message?.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }

    // Fallback with context
    return error?.message || this.getGenericMessage(context);
  }

  /**
   * Get context-specific message for 400 Bad Request
   */
  private static getBadRequestMessage(context: ErrorContext): string {
    if (context.feature === 'auth') {
      switch (context.operation) {
        case 'login':
        case 'register':
          return 'Invalid phone number format. Please check your input.';
        case 'verify':
          return 'Invalid OTP format. Please enter a valid 6-digit OTP.';
        default:
          return 'Invalid request. Please check your input.';
      }
    }

    return 'Invalid request. Please check your input.';
  }

  /**
   * Get context-specific message for 401 Unauthorized
   */
  private static getUnauthorizedMessage(context: ErrorContext): string {
    if (context.feature === 'auth') {
      switch (context.operation) {
        case 'login':
          return 'Invalid phone number or user not found. Please check your phone number or register first.';
        case 'verify':
          return 'Invalid or expired OTP. Please try again or request a new OTP.';
        default:
          return 'Authentication failed. Please try again.';
      }
    }

    return 'Authentication failed. Please login again.';
  }

  /**
   * Get context-specific message for 403 Forbidden
   */
  private static getForbiddenMessage(_context: ErrorContext): string {
    return 'Access denied. Please contact support.';
  }

  /**
   * Get context-specific message for 404 Not Found
   */
  private static getNotFoundMessage(context: ErrorContext): string {
    if (context.feature === 'auth') {
      switch (context.operation) {
        case 'login':
          return 'User not found. Please check your phone number or register first.';
        case 'verify':
          return 'OTP session not found. Please request a new OTP.';
        default:
          return 'Resource not found.';
      }
    }

    return 'Resource not found. Please try again.';
  }

  /**
   * Get context-specific message for 422 Validation Error
   */
  private static getValidationMessage(context: ErrorContext): string {
    if (context.feature === 'auth') {
      switch (context.operation) {
        case 'login':
        case 'register':
          return 'Phone number validation failed. Please enter a valid phone number.';
        case 'verify':
          return 'OTP validation failed. Please enter a valid 6-digit OTP.';
        default:
          return 'Validation failed. Please check your input.';
      }
    }

    return 'Validation failed. Please check your input.';
  }

  /**
   * Get context-specific message for 429 Rate Limit
   */
  private static getRateLimitMessage(context: ErrorContext): string {
    if (context.feature === 'auth') {
      switch (context.operation) {
        case 'login':
          return 'Too many login attempts. Please wait before trying again.';
        case 'register':
          return 'Too many registration attempts. Please wait before trying again.';
        case 'verify':
          return 'Too many OTP attempts. Please wait before trying again.';
        case 'resend':
          return 'Too many resend attempts. Please wait before trying again.';
        default:
          return 'Too many attempts. Please wait before trying again.';
      }
    }

    return 'Too many requests. Please wait before trying again.';
  }

  /**
   * Get generic fallback message with context
   */
  private static getGenericMessage(context: ErrorContext): string {
    if (context.feature === 'auth') {
      switch (context.operation) {
        case 'login':
          return 'Failed to send login OTP. Please try again.';
        case 'register':
          return 'Failed to send registration OTP. Please try again.';
        case 'verify':
          return 'OTP verification failed. Please try again.';
        case 'resend':
          return 'Failed to resend OTP. Please try again.';
        default:
          return 'Authentication operation failed. Please try again.';
      }
    }

    return 'An unexpected error occurred. Please try again.';
  }
}
