import api from './api';

export const buyerService = {
  async getBuyerProfile(buyerId) {
    const response = await api.get(`/api/buyers/${buyerId}/profile`);
    return response.data;
  },
};

