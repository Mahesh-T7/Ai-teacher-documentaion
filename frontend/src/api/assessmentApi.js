import axiosClient from './axiosClient';

export const assessmentApi = {
  getAssessments: (params = {}) => axiosClient.get('/assessments', { params }),
  getAssessmentById: (id) => axiosClient.get(`/assessments/${id}`),
  createAssessment: (data) => axiosClient.post('/assessments', data),
  updateAssessment: (id, data) => axiosClient.put(`/assessments/${id}`, data),
  deleteAssessment: (id) => axiosClient.delete(`/assessments/${id}`),
  getSummaryOverview: (params = {}) => axiosClient.get('/assessments/summary/overview', { params }),
};

export default assessmentApi;
