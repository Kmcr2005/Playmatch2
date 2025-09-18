import { apiService } from './api';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
}

export interface UserProfile {
  user: User;
  location?: {
    coordinates: [number, number];
    address: string;
    city: string;
    state: string;
    country: string;
  };
  sportProfiles: SportProfile[];
}

export interface SportProfile {
  id: number;
  sportId: number;
  sportName: string;
  sportDisplayName: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  preferredSkillLevel: string;
  createdAt: string;
  updatedAt: string;
}

class AuthService {
  async login(email: string, password: string): Promise<LoginResponse> {
    return apiService.post('/auth/login', { email, password });
  }

  async signup(userData: SignupData): Promise<LoginResponse> {
    return apiService.post('/auth/signup', userData);
  }

  async getCurrentUser(): Promise<User> {
    return apiService.get('/auth/me');
  }

  async refreshToken(): Promise<{ token: string }> {
    return apiService.post('/auth/refresh');
  }

  async updateProfile(profileData: Partial<User>): Promise<{ user: User }> {
    return apiService.put('/players/profile', profileData);
  }

  async setLocation(locationData: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  }): Promise<{ message: string }> {
    return apiService.post('/players/location', locationData);
  }

  async addSportProfile(sportId: number, preferredSkillLevel?: string): Promise<{ profile: any }> {
    return apiService.post('/players/sport-profile', { sportId, preferredSkillLevel });
  }

  async getProfile(): Promise<UserProfile> {
    return apiService.get('/players/profile');
  }
}

export const authService = new AuthService();
