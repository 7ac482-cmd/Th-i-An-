import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Đã xảy ra lỗi không mong muốn.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught application error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[#030303] px-5 text-center text-[#ece5e4]">
          <div className="max-w-md rounded-2xl border border-[#521210]/70 bg-[#080303] p-7">
            <h1 className="font-display text-3xl font-semibold text-[#f3eceb]">
              Cá Ngộ Độc
            </h1>
            <p className="mt-3 text-sm text-[#c7b2b0]">
              Kết nối hoặc quyền truy cập gặp sự cố. Bạn hãy tải lại trang để tiếp tục.
            </p>
            <p className="mt-3 break-all rounded-lg bg-[#040202] p-2.5 text-xs text-[#9c7977]">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-[#8b1814] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#a81f1a] cursor-pointer"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
