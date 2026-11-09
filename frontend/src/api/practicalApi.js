import axiosClient from './axiosClient';

export const practicalApi = {
  getPracticals: (params = {}) => axiosClient.get('/practicals', { params }),
  getPracticalById: (id) => axiosClient.get(`/practicals/${id}`),
  createPractical: (data) => axiosClient.post('/practicals', data),
  updatePractical: (id, data) => axiosClient.put(`/practicals/${id}`, data),
  deletePractical: (id) => axiosClient.delete(`/practicals/${id}`),
};

export default practicalApi;
