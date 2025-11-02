import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const attachmentService = {
  async uploadFiles(files, listingId) {
    console.log('[attachmentService] Starting file upload...');
    console.log('[attachmentService] Listing ID:', listingId);
    console.log('[attachmentService] Files count:', files.length);
    
    try {
      // Use native fetch for FormData in React Native - it handles multipart/form-data correctly
      const formData = new FormData();
      files.forEach((file, index) => {
        const fileObject = {
          uri: file.uri,
          type: file.type || 'image/jpeg',
          name: file.fileName || `image_${index}.jpg`,
        };
        console.log(`[attachmentService] Adding file ${index + 1}:`, {
          uri: fileObject.uri.substring(0, 50) + '...',
          type: fileObject.type,
          name: fileObject.name
        });
        formData.append('files', fileObject);
      });
      formData.append('listingId', listingId.toString());
      
      console.log('[attachmentService] FormData prepared, sending request with fetch...');
      
      // Get token for authorization
      const token = await AsyncStorage.getItem('token');
      
      // Get base URL
      const baseURL = api.defaults.baseURL || 'http://10.0.2.2:3000';
      const url = `${baseURL}/api/attachments`;
      
      console.log('[attachmentService] Request URL:', url);
      console.log('[attachmentService] Has token:', !!token);
      
      // Use fetch instead of axios for FormData - React Native's fetch handles it correctly
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          // Don't set Content-Type - fetch will set multipart/form-data with boundary automatically
        },
        body: formData,
      });
      
      console.log('[attachmentService] Response status:', response.status);
      console.log('[attachmentService] Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[attachmentService] Response error text:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        throw {
          response: {
            status: response.status,
            data: errorData,
          },
          message: `Upload failed with status ${response.status}`,
        };
      }
      
      const responseData = await response.json();
      console.log('[attachmentService] ✅ Upload successful!');
      console.log('[attachmentService] Response data:', JSON.stringify(responseData, null, 2));
      return responseData;
    } catch (error) {
      console.error('[attachmentService] ❌ Upload failed!');
      console.error('[attachmentService] Error type:', error.constructor?.name || typeof error);
      console.error('[attachmentService] Error message:', error.message);
      console.error('[attachmentService] Error response status:', error.response?.status);
      console.error('[attachmentService] Error response data:', error.response?.data);
      throw error;
    }
  },

  async getAttachmentsByListing(listingId) {
    const response = await api.get(`/api/attachments/listing/${listingId}`);
    return response.data;
  },

  getAttachmentUrl(attachmentId) {
    // Get base URL from api instance
    const baseURL = api.defaults.baseURL || 'http://localhost:8080';
    return `${baseURL}/api/attachments/${attachmentId}/download`;
  },

  async deleteAttachment(attachmentId) {
    await api.delete(`/api/attachments/${attachmentId}`);
  },
};

