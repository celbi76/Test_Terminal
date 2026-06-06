import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 max-w-lg w-full">
            <h2 className="text-red-400 font-semibold text-lg mb-2">Fehler beim Laden</h2>
            <pre className="text-red-300 text-xs overflow-auto whitespace-pre-wrap">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm"
            >
              Neu laden
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
