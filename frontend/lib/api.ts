import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
});

// 이런 인터셉터를 제거하거나 수정
api.interceptors.response.use(
  (response) => {
    // 여기서 불필요한 로깅이 발생할 수 있음
    return response;
  }
); 