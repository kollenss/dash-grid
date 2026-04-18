import { Component, ReactNode } from 'react'

interface Props { children: ReactNode; cardType: string }
interface State { error: string | null }

export default class CardErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(err: unknown): State {
    return { error: err instanceof Error ? err.message : String(err) }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="glass-card hb-card-error">
          <span className="hb-card-error__msg">
            {this.props.cardType}: {this.state.error}
          </span>
        </div>
      )
    }
    return this.props.children
  }
}
