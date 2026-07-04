const BACKEND_URL = typeof window !== 'undefined'
  ? ''
  : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001');

class ApiClient {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pos_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const tenantId = localStorage.getItem('pos_tenant_id') || 'default-tenant-id';
      headers['X-Tenant-ID'] = tenantId;
    }

    return headers;
  }

  async request<T>(path: string, method: string = 'GET', body?: any): Promise<T> {
    const url = `${BACKEND_URL}${path}`;
    const options: RequestInit = {
      method,
      headers: this.getHeaders(),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (response.status === 401) {
      // Clear token on unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_remembered');
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error ${response.status}`);
    }

    // Try parsing as JSON, fallback to text
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : ({} as T);
    } catch {
      return text as unknown as T;
    }
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, 'GET');
  }

  post<T>(path: string, body: any): Promise<T> {
    return this.request<T>(path, 'POST', body);
  }

  put<T>(path: string, body: any): Promise<T> {
    return this.request<T>(path, 'PUT', body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, 'DELETE');
  }
}

export const apiClient = new ApiClient();
