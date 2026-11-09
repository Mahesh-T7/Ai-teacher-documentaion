import axiosClient from './axiosClient';

export const reportApi = {
  previewReport: (data) => axiosClient.post('/reports/preview', data),
  generateReport: (data) => axiosClient.post('/reports/generate', data),
  approveReport: (id) => axiosClient.post(`/reports/${id}/approve`),
  getReportHistory: (params = {}) => axiosClient.get('/reports', { params }),
  getReportById: (id) => axiosClient.get(`/reports/${id}`),
  downloadReport: (id) =>
    axiosClient.get(`/reports/${id}/download`, { responseType: 'blob' }),
  deleteReport: (id) => axiosClient.delete(`/reports/${id}`),

  // Schedules
  createSchedule: (data) => axiosClient.post('/reports/schedules', data),
  getSchedules: () => axiosClient.get('/reports/schedules'),
  triggerSchedule: (id) => axiosClient.post(`/reports/schedules/${id}/run`),
  deleteSchedule: (id) => axiosClient.delete(`/reports/schedules/${id}`),
};

export default reportApi;
