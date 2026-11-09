import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const backupApi = {
  exportBackup: async () => {
    const res = await axios.post(`${API_URL}/backup/export`, {}, getAuthHeaders());
    return res.data;
  },

  previewRestore: async (backupData) => {
    const res = await axios.post(`${API_URL}/backup/preview`, { backupData }, getAuthHeaders());
    return res.data;
  },

  executeRestore: async ({ backupData, strategy = 'merge', confirmed = true }) => {
    const res = await axios.post(
      `${API_URL}/backup/restore`,
      { backupData, strategy, confirmed },
      getAuthHeaders()
    );
    return res.data;
  },

  getBackupLogs: async () => {
    const res = await axios.get(`${API_URL}/backup/logs`, getAuthHeaders());
    return res.data;
  },
};
