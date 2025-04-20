// src/lib/apiClient.ts

// TODO: Replace with actual API base URL from environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'; 

/**
 * Basic wrapper for making API calls to the backend.
 * This will be expanded later to handle authentication, errors, etc.
 */
const apiClient = {
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    console.log(`[apiClient] GET: ${url.toString()}`);
    // Replace with actual fetch logic
    // const response = await fetch(url.toString());
    // if (!response.ok) throw new Error('API request failed');
    // return response.json();
    console.warn("apiClient.get called - Returning placeholder data");
    return Promise.resolve({} as T); // Placeholder
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`[apiClient] POST: ${url}`, data);
    // Replace with actual fetch logic
    // const response = await fetch(url, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data),
    // });
    // if (!response.ok) throw new Error('API request failed');
    // return response.json();
    console.warn("apiClient.post called - Returning placeholder data");
    return Promise.resolve({} as T); // Placeholder
  },

  async patch<T>(endpoint: string, data: any): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`[apiClient] PATCH: ${url}`, data);
    // Replace with actual fetch logic
    // ... similar to post ...
    console.warn("apiClient.patch called - Returning placeholder data");
    return Promise.resolve({} as T); // Placeholder
  },
  
  async delete<T>(endpoint: string): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`[apiClient] DELETE: ${url}`);
    // Replace with actual fetch logic
    // ... similar to get, but with DELETE method ...
    console.warn("apiClient.delete called - Returning placeholder data");
    return Promise.resolve({} as T); // Placeholder
  },
};

export default apiClient; 