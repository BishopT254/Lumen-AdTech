/**
 * API utility functions for making requests to the backend
 */

// Base API URL from environment variable or default
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Default fetch options
const DEFAULT_OPTIONS: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// HTTP error response handler
class ApiError extends Error {
  status: number;
  data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

// Process API response
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('Content-Type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = isJson && data.message ? data.message : response.statusText;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

// Basic request function
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      ...DEFAULT_OPTIONS,
      ...options,
      headers: {
        ...DEFAULT_OPTIONS.headers,
        ...options.headers,
      },
    });

    return await handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error: ${(error as Error).message}`);
  }
}

// Create request functions for different HTTP methods
export const api = {
  // GET request
  get: <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    return request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  },

  // POST request
  post: <T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> => {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // PUT request
  put: <T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> => {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // PATCH request
  patch: <T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> => {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // DELETE request
  delete: <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    return request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  },
};

// File upload helper
export async function uploadFile(
  endpoint: string,
  file: File,
  additionalData: Record<string, any> = {},
  onProgress?: (percent: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add any additional form data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const xhr = new XMLHttpRequest();
    
    // Set up upload progress tracking
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.open('POST', `${API_URL}${endpoint}`);
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          resolve(xhr.responseText);
        }
      } else {
        reject(new ApiError(xhr.status, xhr.statusText));
      }
    };
    
    xhr.onerror = () => {
      reject(new Error('Network error during file upload'));
    };
    
    xhr.send(formData);
  });
}

// WebSocket connection helper (for real-time features)
export function createWebSocketConnection(endpoint: string): WebSocket {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}${API_URL}${endpoint}`;
  
  return new WebSocket(wsUrl);
} 