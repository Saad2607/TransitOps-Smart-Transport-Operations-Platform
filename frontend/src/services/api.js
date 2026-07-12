import apiClient from './apiClient';

export const authApi = {
  login: async (credentials) => {
    const { data } = await apiClient.post('/auth/login', credentials);
    return data;
  },

  getMe: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  changePassword: async (payload) => {
    const { data } = await apiClient.patch('/auth/change-password', payload);
    return data;
  },

  register: async (payload) => {
    const { data } = await apiClient.post('/auth/register', payload);
    return data;
  },
};

export const fleetApi = {
  getVehicles: async () => {
    const { data } = await apiClient.get('/fleet/vehicles');
    return data;
  },

  createTrip: async (payload = {}) => {
    const { data } = await apiClient.post('/fleet/trips', payload);
    return data;
  },

  getCompliance: async () => {
    const { data } = await apiClient.get('/fleet/drivers/compliance');
    return data;
  },

  getOperationalCost: async () => {
    const { data } = await apiClient.get('/fleet/reports/operational-cost');
    return data;
  },
};
