import axiosClient from './axiosClient';

export const aiApi = {
  getSyllabus: () => axiosClient.get('/ai/syllabus'),
  generate: (data) => axiosClient.post('/ai/generate', data),
  generateDocumentation: (data) => axiosClient.post('/ai/generate-documentation', data, { timeout: 90000 }),
  getDrafts: (params = {}) => axiosClient.get('/ai/drafts', { params }),
  getDraftById: (id) => axiosClient.get(`/ai/drafts/${id}`),
  updateDraft: (id, data) => axiosClient.put(`/ai/drafts/${id}`, data),
  deleteDraft: (id) => axiosClient.delete(`/ai/drafts/${id}`),
  approveDraft: (id) => axiosClient.post(`/ai/drafts/${id}/approve`),
};

export default aiApi;
