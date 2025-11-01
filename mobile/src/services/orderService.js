import api from './api';

export const orderService = {
  async buyNow(listingId) {
    const response = await api.post(`/api/orders/buy-now/${listingId}`);
    return response.data;
  },

  async payOrder(orderId) {
    const response = await api.post(`/api/orders/${orderId}/pay`);
    return response.data;
  },

  async getMyOrders() {
    const response = await api.get('/api/me/orders');
    return response.data;
  },
};

