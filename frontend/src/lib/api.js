import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Customers
export const customerApi = {
  getAll: (search = "") => axios.get(`${API}/customers`, { params: { search } }),
  getById: (id) => axios.get(`${API}/customers/${id}`),
  getByDni: (dni) => axios.get(`${API}/customers/dni/${dni}`),
  getHistory: (id) => axios.get(`${API}/customers/${id}/history`),
  create: (data) => axios.post(`${API}/customers`, data),
};

// Items
export const itemApi = {
  getAll: (params = {}) => axios.get(`${API}/items`, { params }),
  getByBarcode: (barcode) => axios.get(`${API}/items/barcode/${barcode}`),
  create: (data) => axios.post(`${API}/items`, data),
  update: (id, data) => axios.put(`${API}/items/${id}`, data),
  updateStatus: (id, status) => axios.put(`${API}/items/${id}/status`, null, { params: { status } }),
  getStats: () => axios.get(`${API}/items/stats`),
};

// Tariffs
export const tariffApi = {
  getAll: () => axios.get(`${API}/tariffs`),
  get: (itemType) => axios.get(`${API}/tariffs/${itemType}`),
  create: (data) => axios.post(`${API}/tariffs`, data),
};

// Rentals
export const rentalApi = {
  getAll: (params = {}) => axios.get(`${API}/rentals`, { params }),
  getById: (id) => axios.get(`${API}/rentals/${id}`),
  getByBarcode: (barcode) => axios.get(`${API}/rentals/barcode/${barcode}`),
  create: (data) => axios.post(`${API}/rentals`, data),
  processReturn: (id, barcodes, depositAction = "return", forfeitReason = null) => 
    axios.post(`${API}/rentals/${id}/return`, { 
      barcodes,
      deposit_action: depositAction,
      forfeit_reason: forfeitReason
    }),
  processPayment: (id, amount) => axios.post(`${API}/rentals/${id}/payment`, null, { params: { amount } }),
};

// Maintenance
export const maintenanceApi = {
  getAll: (status = "") => axios.get(`${API}/maintenance`, { params: { status } }),
  create: (data) => axios.post(`${API}/maintenance`, data),
  complete: (id) => axios.post(`${API}/maintenance/${id}/complete`),
};

// Reports
export const reportApi = {
  getDaily: (date = "") => axios.get(`${API}/reports/daily`, { params: { date } }),
  getStats: () => axios.get(`${API}/reports/stats`),
};

// Dashboard
export const dashboardApi = {
  get: () => axios.get(`${API}/dashboard`),
};
