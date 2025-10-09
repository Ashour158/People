import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const attendanceService = {
  getTodayAttendance: async () => {
    const { data } = await api.get('/attendance/today');
    return data;
  },
  checkIn: async (payload: any) => {
    const { data } = await api.post('/attendance/check-in', payload);
    return data;
  },
  checkOut: async (payload: any) => {
    const { data } = await api.post('/attendance/check-out', payload);
    return data;
  },
};

export default api;
