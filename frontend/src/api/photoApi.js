import axiosClient from './axiosClient';

export const photoApi = {
  uploadPhotos: (formData, onProgress) =>
    axiosClient.post('/photos/upload', formData, {
      headers: { 'Content-Type': undefined },
      timeout: 120000, // 2 minutes for uploading larger photos
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }),
  getPhotos: (params = {}) => axiosClient.get('/photos', { params }),
  getPhotoById: (id) => axiosClient.get(`/photos/${id}`),
  updatePhoto: (id, data) => axiosClient.put(`/photos/${id}`, data),
  deletePhoto: (id) => axiosClient.delete(`/photos/${id}`),
};

export default photoApi;
