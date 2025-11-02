import api from './api';

export const orderService = {
  async buyNow(listingId) {
    const response = await api.post(`/api/orders/buy-now/${listingId}`);
    return response.data;
  },

  async getOrderDetail(orderId) {
    const response = await api.get(`/api/orders/${orderId}`);
    return response.data;
  },

  async cancelOrder(orderId, reason) {
    const response = await api.post(`/api/orders/${orderId}/cancel`, { reason });
    return response.data;
  },

  async confirmPayment(orderId) {
    const response = await api.post(`/api/orders/${orderId}/confirm-payment`);
    return response.data;
  },

  async confirmReceived(orderId) {
    const response = await api.post(`/api/orders/${orderId}/confirm-received`);
    return response.data;
  },

  async getAIInsights(orderId) {
    const response = await api.get(`/api/orders/${orderId}/ai/insights`);
    return response.data;
  },

  async getMyOrders() {
    const response = await api.get('/api/orders');
    return response.data;
  },
};

