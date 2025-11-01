import api from './api';

export const reviewService = {
  async createReview(reviewData) {
    const response = await api.post('/api/reviews', reviewData);
    return response.data;
  },

  async deleteReview(reviewId) {
    await api.delete(`/api/reviews/${reviewId}`);
  },
};

