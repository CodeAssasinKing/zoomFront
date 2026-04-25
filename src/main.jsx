import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { NotificationProvider } from './components/NotificationContext.jsx'

createRoot(document.getElementById('root')).render(
	<NotificationProvider>
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</NotificationProvider>,
)
