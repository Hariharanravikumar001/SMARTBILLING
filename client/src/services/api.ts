const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('ub_auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const branchId = localStorage.getItem('ub_active_branch_id');
    if (branchId) {
      headers['x-branch-id'] = branchId;
    }

    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = { ...this.getHeaders(), ...(options.headers as Record<string, string>) };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: Request failed.`);
      }

      return data as T;
    } catch (error: any) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error.message);
      throw error;
    }
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

// Offline Local Queue for PWA Offline Billing
export const offlineQueue = {
  getQueue(): any[] {
    try {
      return JSON.parse(localStorage.getItem('ub_offline_sales') || '[]');
    } catch {
      return [];
    }
  },
  enqueue(sale: any) {
    const queue = this.getQueue();
    queue.push({ ...sale, queuedAt: new Date().toISOString() });
    localStorage.setItem('ub_offline_sales', JSON.stringify(queue));
  },
  clear() {
    localStorage.removeItem('ub_offline_sales');
  }
};
