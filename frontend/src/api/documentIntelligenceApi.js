import axiosClient from './axiosClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const documentIntelligenceApi = {
  // Document Management
  uploadDocuments: (formData, onProgress) =>
    axiosClient.post('/document-intelligence/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }),

  getDocuments: (params = {}) =>
    axiosClient.get('/document-intelligence/documents', { params }),

  getDocumentById: (id) =>
    axiosClient.get(`/document-intelligence/documents/${id}`),

  updateDocument: (id, data) =>
    axiosClient.put(`/document-intelligence/documents/${id}`, data),

  replaceDocument: (id, formData) =>
    axiosClient.post(`/document-intelligence/documents/${id}/replace`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),

  deleteDocument: (id) =>
    axiosClient.delete(`/document-intelligence/documents/${id}`),

  getPreviewUrl: (id) => {
    const token = localStorage.getItem('teacher_token');
    return `${API_BASE_URL}/document-intelligence/documents/${id}/preview?token=${token || ''}`;
  },

  // Extraction & Processing Jobs
  startProcessingJob: (data) =>
    axiosClient.post('/document-intelligence/jobs/process', data, { timeout: 120000 }),

  getJobStatus: (id) =>
    axiosClient.get(`/document-intelligence/jobs/${id}/status`),

  retryJob: (id) =>
    axiosClient.post(`/document-intelligence/jobs/${id}/retry`, {}, { timeout: 120000 }),

  // Automatic Documentation Generation
  generateDocumentation: (data) =>
    axiosClient.post('/document-intelligence/generate', data, { timeout: 120000 }),

  getMaterialById: (id) =>
    axiosClient.get(`/document-intelligence/materials/${id}`),

  updateMaterial: (id, data) =>
    axiosClient.put(`/document-intelligence/materials/${id}`, data),

  regenerateSection: (id, sectionName) =>
    axiosClient.post(`/document-intelligence/materials/${id}/regenerate-section`, { sectionName }, { timeout: 60000 }),

  approveMaterial: (id) =>
    axiosClient.post(`/document-intelligence/materials/${id}/approve`),

  convertToLessonPlan: (id) =>
    axiosClient.post(`/document-intelligence/materials/${id}/convert-to-lesson-plan`),

  createDiaryDraft: (id, data = {}) =>
    axiosClient.post(`/document-intelligence/materials/${id}/create-diary-draft`, data),

  getWordExportUrl: (id) =>
    `${API_BASE_URL}/document-intelligence/materials/${id}/export/word`,

  getPdfExportUrl: (id) =>
    `${API_BASE_URL}/document-intelligence/materials/${id}/export/pdf`,
};

export default documentIntelligenceApi;
