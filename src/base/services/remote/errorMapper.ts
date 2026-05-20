import { ErrorType, ValidationError, NetworkError, ErrorDto } from './apiTypes';

const getErrorMessage = (type: ErrorType): string => {
  switch (type) {
    case 'AUTHORIZATION':        return 'You are not authorized to access this resource.';
    case 'SERVER_NOT_RESPONDING': return 'Unable to reach server. Please try again later.';
    case 'SERVER_NOT_FOUND':     return 'Unable to find server. Please check your connection or try again later.';
    case 'REQUEST_TIMED_OUT':    return 'Request timed out. Please try again.';
    case 'NO_INTERNET':          return 'Please check your internet connection and try again.';
    case 'SERVER_ERROR':         return 'Server encountered an error. Please try again or contact us to raise an issue.';
    case 'ENCODE_FAILED':        return 'Request could not be created. Please try again or contact us to raise an issue.';
    case 'DECODE_FAILED':        return 'Response could not be read. Please try again or contact us to raise an issue.';
    case 'UNKNOWN':              return 'Something went wrong.';
    default:                     return 'Something went wrong.';
  }
};

const getErrorTypeFromStatus = (status: number): ErrorType => {
  switch (status) {
    case 400: return 'ENCODE_FAILED';
    case 401: return 'AUTHENTICATION';
    case 403: return 'AUTHORIZATION';
    case 404: return 'SERVER_NOT_FOUND';
    case 408: return 'REQUEST_TIMED_OUT';
    case 422: return 'CUSTOM';
    case 429:
    case 503: return 'SERVER_NOT_RESPONDING';
    case 500: return 'SERVER_ERROR';
    default:  return 'UNKNOWN';
  }
};

const parseValidationErrors = (errors?: Record<string, string[]>): ValidationError[] => {
  if (!errors) return [];
  return Object.entries(errors).map(([key, messages]) => ({ key, messages }));
};

const buildNetworkError = (
  type: ErrorType,
  message?: string,
  code?: string,
  statusCode?: number,
  timestamp?: string,
  errors?: ValidationError[]
): NetworkError => {
  const primaryMessage = message || getErrorMessage(type);
  const validationMessages = errors?.flatMap(e => e.messages) || [];
  const fullMessage = validationMessages.length > 0
    ? `${primaryMessage}\n${validationMessages.join('\n')}`
    : primaryMessage;

  return { type, message: primaryMessage, code, statusCode, timestamp, errors, fullMessage };
};

export class ErrorMapper {
  static createNetworkError(type: ErrorType, message?: string): NetworkError {
    return buildNetworkError(type, message);
  }

  static async mapFetchResponse(response: Response): Promise<NetworkError> {
    const statusCode = response.status;

    let errorDto: ErrorDto | null = null;
    try {
      const text = await response.text();
      if (text) errorDto = JSON.parse(text) as ErrorDto;
    } catch {
      // Ignore parse errors — fall through to status-only mapping
    }

    if (!errorDto) {
      return buildNetworkError(getErrorTypeFromStatus(statusCode), undefined, undefined, statusCode);
    }

    const dtoStatus = errorDto.status ? parseInt(errorDto.status) : undefined;
    const errorType = getErrorTypeFromStatus(dtoStatus || statusCode);
    const validationErrors = parseValidationErrors(errorDto.errors);

    return buildNetworkError(errorType, errorDto.message, errorDto.code, statusCode, errorDto.timestamp, validationErrors);
  }

  static isNetworkError(type: ErrorType): boolean {
    return ['SERVER_NOT_RESPONDING', 'SERVER_NOT_FOUND', 'REQUEST_TIMED_OUT', 'NO_INTERNET'].includes(type);
  }

  static isApplicationError(type: ErrorType): boolean {
    return ['AUTHENTICATION', 'DEFAULTS_NOT_LOADED', 'SERVER_ERROR', 'ENCODE_FAILED', 'DECODE_FAILED'].includes(type);
  }

  static isBackendError(type: ErrorType): boolean {
    return type === 'CUSTOM';
  }
}
