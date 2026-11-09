import axiosClient from './axiosClient';

export const lessonPlanApi = {
  getLessonPlans: (params = {}) => axiosClient.get('/lesson-plans', { params }),
  getLessonPlanById: (id) => axiosClient.get(`/lesson-plans/${id}`),
  createLessonPlan: (data) => axiosClient.post('/lesson-plans', data),
  updateLessonPlan: (id, data) => axiosClient.put(`/lesson-plans/${id}`, data),
  deleteLessonPlan: (id) => axiosClient.delete(`/lesson-plans/${id}`),
  updateApproval: (id, status, approverRemarks = '') =>
    axiosClient.patch(`/lesson-plans/${id}/approval`, { status, approverRemarks }),
  duplicatePlan: (id) => axiosClient.post(`/lesson-plans/${id}/duplicate`),
  downloadLessonPlanPdf: (id) =>
    axiosClient.get(`/lesson-plans/${id}/pdf`, { responseType: 'blob' }),
  downloadLessonPlanPreviewPdf: (data) =>
    axiosClient.post('/lesson-plans/preview-pdf', data, { responseType: 'blob' }),
};
