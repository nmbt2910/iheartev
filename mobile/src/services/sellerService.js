import api from './api';

export const sellerService = {
  async getSellerProfile(sellerId) {
    const response = await api.get(`/api/sellers/${sellerId}/profile`);
    return response.data;
  },

  async getSellerCurrentListings(sellerId) {
    const response = await api.get(`/api/sellers/${sellerId}/listings/current`);
    return response.data;
  },

  async getSellerSoldListings(sellerId) {
    const response = await api.get(`/api/sellers/${sellerId}/listings/sold`);
    return response.data;
  },

  async getSellerReviews(sellerId) {
    const response = await api.get(`/api/sellers/${sellerId}/reviews`);
    return response.data;
  },
};

