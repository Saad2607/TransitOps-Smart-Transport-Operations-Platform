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

export const vehicleApi = {
  list: async (params = {}) => {
    const { data } = await apiClient.get('/vehicles', { params });
    return data;
  },

  getById: async (id) => {
    const { data } = await apiClient.get(`/vehicles/${id}`);
    return data;
  },

  create: async (payload) => {
    const { data } = await apiClient.post('/vehicles', payload);
    return data;
  },

  update: async (id, payload) => {
    const { data } = await apiClient.put(`/vehicles/${id}`, payload);
    return data;
  },

  remove: async (id) => {
    const { data } = await apiClient.delete(`/vehicles/${id}`);
    return data;
  },
};

export const driverApi = {
  list: async (params = {}) => {
    const { data } = await apiClient.get('/drivers', { params });
    return data;
  },

  getById: async (id) => {
    const { data } = await apiClient.get(`/drivers/${id}`);
    return data;
  },

  create: async (payload) => {
    const { data } = await apiClient.post('/drivers', payload);
    return data;
  },

  update: async (id, payload) => {
    const { data } = await apiClient.put(`/drivers/${id}`, payload);
    return data;
  },

  suspend: async (id) => {
    const { data } = await apiClient.patch(`/drivers/${id}/suspend`);
    return data;
  },

  remove: async (id) => {
    const { data } = await apiClient.delete(`/drivers/${id}`);
    return data;
  },

  listEligible: async () => {
    const { data } = await apiClient.get('/drivers/eligible');
    return data;
  },
};

export const tripApi = {
  list: async (params = {}) => {
    const { data } = await apiClient.get('/trips', { params });
    return data;
  },

  getById: async (id) => {
    const { data } = await apiClient.get(`/trips/${id}`);
    return data;
  },

  create: async (payload) => {
    const { data } = await apiClient.post('/trips', payload);
    return data;
  },

  update: async (id, payload) => {
    const { data } = await apiClient.put(`/trips/${id}`, payload);
    return data;
  },

  dispatch: async (id) => {
    const { data } = await apiClient.patch(`/trips/${id}/dispatch`);
    return data;
  },

  complete: async (id, payload = {}) => {
    const { data } = await apiClient.patch(`/trips/${id}/complete`, payload);
    return data;
  },

  cancel: async (id) => {
    const { data } = await apiClient.patch(`/trips/${id}/cancel`);
    return data;
  },
};

export const analyticsApi = {
  getDashboard: async (params = {}) => {
    const { data } = await apiClient.get('/analytics/dashboard', { params });
    return data;
  },

  getFleetUtilization: async (params = {}) => {
    const { data } = await apiClient.get('/analytics/fleet-utilization', { params });
    return data;
  },

  getVehicleRoi: async (params = {}) => {
    const { data } = await apiClient.get('/analytics/vehicle-roi', { params });
    return data;
  },
};
