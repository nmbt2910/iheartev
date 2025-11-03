import api from './api';

export const reviewService = {
  async createReview(reviewData) {
    const response = await api.post('/api/reviews', reviewData);
    return response.data;
  },

  async updateReview(reviewId, reviewData) {
    const response = await api.put(`/api/reviews/${reviewId}`, reviewData);
    return response.data;
  },

  async getReview(reviewId) {
    const response = await api.get(`/api/reviews/${reviewId}`);
    return response.data;
  },

  async deleteReview(reviewId) {
    await api.delete(`/api/reviews/${reviewId}`);
  },
};

