import api from './api';

export const listingService = {
  async getListings(params = {}) {
    const response = await api.get('/api/listings', { params });
    return response.data;
  },

  async getListingById(id) {
    const response = await api.get(`/api/listings/${id}`);
    return response.data;
  },

  async getMyListings() {
    const response = await api.get('/api/me/listings');
    return response.data;
  },

  async createListing(listingData) {
    const response = await api.post('/api/listings', listingData);
    return response.data;
  },

  async updateListing(id, listingData) {
    const response = await api.put(`/api/listings/${id}`, listingData);
    return response.data;
  },

  async deleteListing(id) {
    await api.delete(`/api/listings/${id}`);
  },
};

