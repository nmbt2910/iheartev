import api from './api';

export const adminService = {
  async verifyListing(listingId) {
    const response = await api.post(`/api/admin/listings/${listingId}/verify`);
    return response.data;
  },

  async getSummaryReport() {
    const response = await api.get('/api/admin/reports/summary');
    return response.data;
  },

  async getPendingListings() {
    const response = await api.get('/api/admin/listings/pending');
    return response.data;
  },

  async approveListing(listingId) {
    const response = await api.post(`/api/admin/listings/${listingId}/approve`);
    return response.data;
  },

  async rejectListing(listingId) {
    const response = await api.post(`/api/admin/listings/${listingId}/reject`);
    return response.data;
  },
};

