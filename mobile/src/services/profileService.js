import api from './api';

export const profileService = {
  async getMyProfile() {
    const response = await api.get('/api/me/profile');
    return response.data;
  },

  async updateMyProfile(updates) {
    const response = await api.put('/api/me/profile', updates);
    return response.data;
  },
};

