import axios from 'axios';

const app = axios.create({
  headers: {
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Origin': 'http://localhost:8080',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export default app;
