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
};

