import axiosClient from './axiosClient';

export const attendanceApi = {
  // Student roster
  getStudents: (params = {}) => axiosClient.get('/attendance/students', { params }),
  addStudent: (data) => axiosClient.post('/attendance/students', data),
  updateStudent: (id, data) => axiosClient.put(`/attendance/students/${id}`, data),
  deleteStudent: (id) => axiosClient.delete(`/attendance/students/${id}`),
  importStudents: (data) => axiosClient.post('/attendance/students/import', data),

  // Roll call & summaries
  recordAttendance: (data) => axiosClient.post('/attendance', data),
  getAttendanceHistory: (params = {}) => axiosClient.get('/attendance', { params }),
  getAttendanceByDate: (params = {}) => axiosClient.get('/attendance/by-date', { params }),
  updateAttendance: (id, data) => axiosClient.put(`/attendance/${id}`, data),
  getMonthlySummary: (params = {}) => axiosClient.get('/attendance/summary/monthly', { params }),
};

export default attendanceApi;
