/**
 * auth.js - Authentication utilities for Clinic Co-Pilot
 * Handles login, token storage, and authenticated API calls
 */

const AUTH = {
  // API Base URL - auto-detect from current location or use default
  API_BASE: (function() {
    // If running from file:// or different origin, use default
    if (window.location.protocol === 'file:' || !window.location.origin.includes('localhost')) {
      return "http://localhost:8000";
    }
    // Use same origin as current page
    return window.location.origin;
  })(),
  
  // Token storage key
  TOKEN_KEY: "clinic_copilot_token",
  USER_KEY: "clinic_copilot_user",
  
  /**
   * Store authentication data after login
   */
  setAuth(tokenResponse) {
    sessionStorage.setItem(this.TOKEN_KEY, tokenResponse.access_token);
    sessionStorage.setItem(this.USER_KEY, JSON.stringify({
      staff_id: tokenResponse.staff_id,
      role: tokenResponse.role,
      full_name: tokenResponse.full_name
    }));
  },
  
  /**
   * Get stored token
   */
  getToken() {
    return sessionStorage.getItem(this.TOKEN_KEY);
  },
  
  /**
   * Get stored user info
   */
  getUser() {
    const userStr = sessionStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },
  
  /**
   * Check if user is authenticated (token exists and not expired)
   */
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    
    // Check if token is expired by decoding JWT
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      if (Date.now() >= expiry) {
        console.log('[AUTH] Token expired, clearing auth');
        this.clearAuth();
        return false;
      }
      return true;
    } catch (e) {
      console.error('[AUTH] Invalid token format');
      this.clearAuth();
      return false;
    }
  },
  
  /**
   * Check remaining session time in minutes
   */
  getSessionTimeRemaining() {
    const token = this.getToken();
    if (!token) return 0;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;
      const remaining = Math.max(0, expiry - Date.now());
      return Math.floor(remaining / 60000); // Return minutes
    } catch (e) {
      return 0;
    }
  },
  
  /**
   * Clear authentication data (logout)
   */
  clearAuth() {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
  },
  
  /**
   * Get authorization headers for API calls
   */
  getAuthHeaders() {
    const token = this.getToken();
    if (!token) return {};
    return {
      "Authorization": `Bearer ${token}`
    };
  },
  
  /**
   * Login with staff_id and password
   * Returns: { success: true, data: tokenResponse } or { success: false, error: string }
   */
  async login(staffId, password) {
    try {
      const response = await fetch(`${this.API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: staffId, password: password })
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: "Invalid staff ID or password" };
        }
        const text = await response.text();
        return { success: false, error: text || "Login failed" };
      }
      
      const data = await response.json();
      this.setAuth(data);
      return { success: true, data: data };
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, error: "Connection error. Is the server running?" };
    }
  },
  
  /**
   * Logout and redirect to login page
   */
  logout(loginUrl) {
    this.clearAuth();
    window.location.href = loginUrl || "/";
  },
  
  /**
   * Make an authenticated API call
   * Automatically adds auth headers and handles 401 responses
   */
  async fetchWithAuth(url, options = {}) {
    const token = this.getToken();
    
    if (!token) {
      return { ok: false, status: 401, error: "Not authenticated" };
    }
    
    const headers = {
      ...options.headers,
      ...this.getAuthHeaders()
    };
    
    try {
      const response = await fetch(url, { ...options, headers });
      
      if (response.status === 401) {
        // Token expired or invalid - clear and redirect
        this.clearAuth();
        return { ok: false, status: 401, error: "Session expired" };
      }
      
      return response;
    } catch (err) {
      console.error("API error:", err);
      throw err;
    }
  },
  
  /**
   * Require authentication - redirect to login if not authenticated
   */
  requireAuth(loginUrl) {
    if (!this.isAuthenticated()) {
      window.location.href = loginUrl;
      return false;
    }
    return true;
  },
  
  /**
   * Require specific role - redirect if wrong role
   */
  requireRole(requiredRole, loginUrl) {
    if (!this.requireAuth(loginUrl)) return false;
    
    const user = this.getUser();
    if (user.role !== requiredRole) {
      alert(`Access denied. This page is for ${requiredRole} only.`);
      this.clearAuth();
      window.location.href = loginUrl;
      return false;
    }
    return true;
  }
};

// Make AUTH available globally
window.AUTH = AUTH;
