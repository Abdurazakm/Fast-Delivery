import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:4800/api',
});

export default API;
