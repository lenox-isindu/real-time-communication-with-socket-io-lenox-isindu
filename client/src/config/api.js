
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_URLS = {
  BASE: API_BASE_URL,
  USERS: `${API_BASE_URL}/api/users`,
  FILES: `${API_BASE_URL}/api/files`,
  FILES_UPLOAD: `${API_BASE_URL}/api/files/upload`,
  FILES_INFO: `${API_BASE_URL}/api/files/info`,
  AUTH: `${API_BASE_URL}/api/auth`,
  MESSAGES: `${API_BASE_URL}/api/messages`,
};

export default API_BASE_URL;