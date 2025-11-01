import api from './api';

export const favoriteService = {
  async addFavorite(listingId) {
    await api.post(`/api/favorites/${listingId}`);
  },

  async removeFavorite(favoriteId) {
    await api.delete(`/api/favorites/${favoriteId}`);
  },

  async removeFavoriteByListing(listingId) {
    await api.delete(`/api/favorites/listing/${listingId}`);
  },

  async checkFavorite(listingId) {
    try {
      const response = await api.get(`/api/favorites/listing/${listingId}/check`);
      return response.data;
    } catch (error) {
      // If user is not authenticated (401) or forbidden (403), return not favorited
      if (error.response?.status === 401 || error.response?.status === 403) {
        return { isFavorite: false, favoriteId: null };
      }
      throw error;
    }
  },

  async getMyFavorites() {
    const response = await api.get('/api/me/favorites');
    return response.data;
  },
};

