import axiosClient from './axiosClient';

export const userApi = {
  updateProfile: (data) => axiosClient.put('/users/profile', data),
};
