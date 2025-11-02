import api from './api';

export const bankService = {
  async getAllBanks() {
    const response = await api.get('/api/banks');
    return response.data;
  },
};

