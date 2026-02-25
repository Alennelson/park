// API Configuration
// Replace this URL with your actual backend URL after deployment
const API_CONFIG = {
  // For local development, use: http://localhost:3000
  // For production, use your deployed backend URL (e.g., https://your-backend.herokuapp.com)
  BASE_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://parkify-backend-hahp.onrender.com', // ⚠️ REPLACE THIS WITH YOUR ACTUAL BACKEND URL
  
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    BOOKINGS: '/api/booking',
    PARKING: '/api/parking'
  }
};

// Helper function to build full API URL
function getApiUrl(endpoint) {
  // Ensure endpoint starts with /
  if (endpoint && !endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }
  return API_CONFIG.BASE_URL + endpoint;
}
