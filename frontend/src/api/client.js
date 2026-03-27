import axios from 'axios'

const apiHost = window.location.hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost'

const api = axios.create({
  baseURL: `http://${apiHost}:8000/api/v1`,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const noResponse = !error.response
    if (noResponse || (status != null && status >= 500)) {
      console.error('[API]', error.message, { url: error.config?.url, status })
    }
    return Promise.reject(error)
  }
)

export default api
