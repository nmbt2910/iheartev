import api from './api';

export const aiService = {
  async suggestPrice(featuresJson) {
    const response = await api.post('/api/ai/suggest-price', featuresJson, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  async getOverview(listingData) {
    try {
      // Use the api instance which now skips auth for this endpoint
      const response = await api.post('/api/ai/overview', JSON.stringify(listingData), {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

