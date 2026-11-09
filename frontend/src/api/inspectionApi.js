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

export const inspectionApi = {
  getReadiness: async (academicYear = '2026-2027') => {
    const res = await axios.get(
      `${API_URL}/inspection/readiness?academicYear=${encodeURIComponent(academicYear)}`,
      getAuthHeaders()
    );
    return res.data;
  },

  generatePackage: async (payload) => {
    const res = await axios.post(`${API_URL}/inspection/package/generate`, payload, getAuthHeaders());
    return res.data;
  },

  getPackages: async (academicYear) => {
    const query = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : '';
    const res = await axios.get(`${API_URL}/inspection/packages${query}`, getAuthHeaders());
    return res.data;
  },

  downloadPackage: async (id, filename = 'inspection-package.zip') => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/inspection/packages/${id}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return true;
  },

  deletePackage: async (id) => {
    const res = await axios.delete(`${API_URL}/inspection/packages/${id}`, getAuthHeaders());
    return res.data;
  },
};
