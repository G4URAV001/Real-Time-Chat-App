// API utility functions for making authenticated requests

// Make sure the API URL ends with /api
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

console.log('Using API URL:', API_URL);

/**
 * Get the authentication token from localStorage
 */
export const getToken = (): string | null => {
  return localStorage.getItem('chatToken');
};

/**
 * Get default headers for API requests
 */
export const getHeaders = (includeAuth = true): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

/**
 * Make an authenticated API request
 */
export const apiRequest = async <T>(
  endpoint: string,
  method: string = 'GET',
  data?: any,
  requireAuth: boolean = true
): Promise<T> => {
  const url = `${API_URL}${endpoint}`;
  
  // Log request details for debugging
  console.log(`Making ${method} request to ${url}`);
  
  const headers = getHeaders(requireAuth);
  console.log('Request headers:', headers);
  
  if (data) {
    console.log('Request data:', data);
  }
  
  const options: RequestInit = {
    method,
    headers,
    // Don't use credentials: 'include' as it can cause CORS issues
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    
    // Log response details
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Response is not JSON:', contentType);
      const text = await response.text();
      console.error('Response text:', text);
      throw new Error(`API returned non-JSON response: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log('Response data:', responseData);

    if (!response.ok) {
      throw new Error(responseData.message || `API request failed with status ${response.status}`);
    }

    return responseData;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// API methods
export const api = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string) => 
      apiRequest('/auth/login', 'POST', { email, password }, false),
    register: (username: string, email: string, password: string) => 
      apiRequest('/auth/register', 'POST', { username, email, password }, false),
    getProfile: () => 
      apiRequest('/auth/profile'),
  },
  
  // Rooms endpoints
  rooms: {
    getPublicRooms: () => 
      apiRequest('/rooms/public', 'GET', undefined, false),
    getUserRooms: () => 
      apiRequest('/rooms/user'),
    getRoom: (roomId: string) => 
      apiRequest(`/rooms/${roomId}`),
    createRoom: (roomData: any) => 
      apiRequest('/rooms', 'POST', roomData),
    joinRoom: (inviteCode: string) => 
      apiRequest('/rooms/join', 'POST', { inviteCode }),
    leaveRoom: (roomId: string) => 
      apiRequest(`/rooms/${roomId}/leave`, 'DELETE'),
    deleteRoom: (roomId: string) => 
      apiRequest(`/rooms/${roomId}`, 'DELETE'),
    generateInviteCode: (roomId: string) => 
      apiRequest(`/rooms/${roomId}/invite`, 'POST'),
    removeMember: (roomId: string, memberId: string) => 
      apiRequest(`/rooms/${roomId}/members/${memberId}`, 'DELETE'),
  },
  
  // Messages endpoints
  messages: {
    getRoomMessages: (roomId: string) => 
      apiRequest(`/messages/room/${roomId}`),
    getDirectMessages: (userId: string) => 
      apiRequest(`/messages/direct/${userId}`),
  },
  
  // Users endpoints
  users: {
    getUsers: () => 
      apiRequest('/users'),
    getUserById: (userId: string) => 
      apiRequest(`/users/${userId}`),
    updateProfile: (userData: { username?: string; password?: string; avatar?: string }) => 
      apiRequest('/users/profile', 'PUT', userData),
    updateStatus: (status: string) => 
      apiRequest('/users/status', 'PUT', { status }),
  }
};

export default api;
