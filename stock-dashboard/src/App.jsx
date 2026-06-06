import Dashboard from './components/Dashboard'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

export default function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  )
}
