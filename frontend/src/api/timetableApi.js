import axiosClient from './axiosClient';

export const timetableApi = {
  getTimetable: (params = {}) => axiosClient.get('/timetable', { params }),
  getTimetableById: (id) => axiosClient.get(`/timetable/${id}`),
  createTimetable: (data) => axiosClient.post('/timetable', data),
  updateTimetable: (id, data) => axiosClient.put(`/timetable/${id}`, data),
  deleteTimetable: (id) => axiosClient.delete(`/timetable/${id}`),
};
