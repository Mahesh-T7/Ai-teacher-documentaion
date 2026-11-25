import axiosClient from './axiosClient';

export const examApi = {
  // Templates
  getTemplates: (params = {}) => axiosClient.get('/exams/templates', { params }),
  getTemplateById: (id) => axiosClient.get(`/exams/templates/${id}`),
  createTemplate: (data) => axiosClient.post('/exams/templates', data),
  updateTemplate: (id, data) => axiosClient.put(`/exams/templates/${id}`, data),
  deleteTemplate: (id) => axiosClient.delete(`/exams/templates/${id}`),
  duplicateTemplate: (id, data = {}) => axiosClient.post(`/exams/templates/${id}/duplicate`, data),
  previewCalculation: (data) => axiosClient.post('/exams/templates/preview', data),

  // Records / Marks
  getExamRecords: (params = {}) => axiosClient.get('/exams/records', { params }),
  getExamRecordById: (id) => axiosClient.get(`/exams/records/${id}`),
  createExamRecord: (data) => axiosClient.post('/exams/records', data),
  updateExamRecord: (id, data) => axiosClient.put(`/exams/records/${id}`, data),
  finalizeExamRecord: (id) => axiosClient.post(`/exams/records/${id}/finalize`),
  unlockExamRecord: (id) => axiosClient.post(`/exams/records/${id}/unlock`),
  deleteExamRecord: (id) => axiosClient.delete(`/exams/records/${id}`),

  // Reports & Exports
  downloadClassRegisterPdf: (id) =>
    axiosClient.get(`/exams/records/${id}/export/pdf`, { responseType: 'blob' }),
  downloadLiveRegisterPdf: (data) =>
    axiosClient.post('/exams/preview-register-pdf', data, { responseType: 'blob' }),
  downloadClassRegisterExcel: (id) =>
    axiosClient.get(`/exams/records/${id}/export/excel`, { responseType: 'blob' }),
  downloadNsqfExcelFormat: (id) =>
    axiosClient.get(`/exams/records/${id}/export/nsqf-excel`, { responseType: 'blob' }),
  downloadNormalExcelFormat: (id) =>
    axiosClient.get(`/exams/records/${id}/export/normal-excel`, { responseType: 'blob' }),
  downloadExcelFormatTemplate: (params = {}) =>
    axiosClient.get('/exams/template-excel', { params, responseType: 'blob' }),
  downloadStudentReportCardPdf: (id, studentId) =>
    axiosClient.get(`/exams/records/${id}/students/${studentId}/report-card`, { responseType: 'blob' }),
  downloadBulkReportCardsPdf: (id) =>
    axiosClient.get(`/exams/records/${id}/export/bulk-report-cards`, { responseType: 'blob' }),

  // Excel Upload Import & Roster Sync
  importExcelMarks: (formData) =>
    axiosClient.post('/exams/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  importStudentsExcel: (formData) =>
    axiosClient.post('/exams/import-students-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  syncStudents: (data) => axiosClient.post('/exams/sync-students', data),
};

export default examApi;
