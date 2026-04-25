import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL

const api = axios.create({
	baseURL: baseURL,
	withCredentials: true,
	headers: {
		// Этот заголовок отключает страницу-предупреждение ngrok
		'ngrok-skip-browser-warning': 'true',
		Accept: 'application/json',
		'Content-Type': 'application/json',
	},
})

// Response Interceptor
api.interceptors.response.use(
	response => {
		// If the request is successful, just return the response
		return response
	},
	async error => {
		const originalRequest = error.config

		// Check if error is 401 (Expired Token) and we haven't retried yet
		if (
			(error.response && error.response.status === 401) ||
			(error.response.status == 422 && !originalRequest._retry)
		) {
			originalRequest._retry = true

			try {
				// 1. Call the refresh endpoint
				// Use the base axios instance to avoid infinite loops
				await axios.post(
					`${baseURL}/auth/refresh`,
					{},
					{ withCredentials: true },
				)

				// 2. If successful, retry the original request that failed
				return api(originalRequest)
			} catch (refreshError) {
				// 3. If refresh fails (refresh token also expired), redirect to login
				console.error('Session expired. Please login again.')
				// Optional: clear local storage/state here
				window.location.href = '/login'
				return Promise.reject(refreshError)
			}
		}

		// For all other errors, just pass them through
		return Promise.reject(error)
	},
)

export default api
