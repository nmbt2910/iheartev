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
    console.log('[listingService] Creating listing...');
    console.log('[listingService] Request data:', JSON.stringify(listingData, null, 2));
    try {
      const response = await api.post('/api/listings', listingData);
      console.log('[listingService] ✅ Listing created successfully');
      console.log('[listingService] Response status:', response.status);
      console.log('[listingService] Response data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('[listingService] ❌ Error creating listing');
      console.error('[listingService] Error:', error);
      console.error('[listingService] Response:', error.response?.data);
      throw error;
    }
  },

  async updateListing(id, listingData) {
    const response = await api.put(`/api/listings/${id}`, listingData);
    return response.data;
  },

  async deleteListing(id) {
    await api.delete(`/api/listings/${id}`);
  },
};

