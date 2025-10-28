import axios from 'axios';

const API = axios.create({
  baseURL: 'https://fast-delivery-4gog.onrender.com/api',
});

export default API;
