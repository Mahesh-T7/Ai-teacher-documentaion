import axiosClient from './axiosClient';

export const diaryApi = {
  getDiaryEntries: (params = {}) => axiosClient.get('/diary', { params }),
  getDiaryEntryById: (id) => axiosClient.get(`/diary/${id}`),
  createDiaryEntry: (data) => axiosClient.post('/diary', data),
  updateDiaryEntry: (id, data) => axiosClient.put(`/diary/${id}`, data),
  deleteDiaryEntry: (id) => axiosClient.delete(`/diary/${id}`),
  updateDiaryStatus: (id, status, teacherConfirmed = true) =>
    axiosClient.patch(`/diary/${id}/status`, { status, teacherConfirmed }),
};
