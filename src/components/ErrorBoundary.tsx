import React, { Component, ErrorInfo, ReactNode } from 'react';
import moryaLogo from '../assets/morya_logo.jpg';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('Failed to clear localStorage', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-950 via-rose-950 to-orange-950 text-white flex items-center justify-center p-4 font-sans">
          <div className="bg-slate-900 border border-amber-500/40 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-5">
            <img
              src={moryaLogo}
              alt="मोरया ग्रुप मित्र मंडळ (ट्रस्ट)"
              className="w-20 h-20 object-contain rounded-full border-2 border-amber-400 p-0.5 bg-slate-950 mx-auto shadow-xl"
            />

            <div>
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold uppercase">
                मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
              </span>
              <h2 className="text-xl font-black mt-2 text-white">
                ॲप रीलोड करणे आवश्यक आहे
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                वेबसाईट लोड होताना एक तात्पुरती तांत्रिक अडचण आली आहे. खालील बटनावर क्लिक करून ॲप पुन्हा लोड करा.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-rose-300 text-[10px] font-mono text-left max-h-24 overflow-y-auto">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg cursor-pointer transition-all active:scale-95"
              >
                🔄 पुन्हा लोड करा (Reload App)
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer transition-all active:scale-95"
              >
                ⚙️ लोकल डेटा रीसेट करून सुरू करा (Reset Data)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
