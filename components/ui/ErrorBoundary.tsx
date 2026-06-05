'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  key: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, key: 0 };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (error.message?.includes('border')) {
      this.setState({ hasError: false, key: this.state.key + 1 });
    }
  }

  render() {
    if (this.state.hasError) {
      return <div key={this.state.key}>{this.props.children}</div>;
    }
    return <div key={this.state.key}>{this.props.children}</div>;
  }
}
