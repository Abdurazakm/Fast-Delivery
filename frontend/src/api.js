import axios from 'axios';

const API = axios.create({
  // baseURL: 'https://fast-delivery-4gog.onrender.com/api',
  baseURL: 'http://localhost:4800/api',
});

export default API;
