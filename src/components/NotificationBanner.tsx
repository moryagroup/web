import React from 'react';
import { AppNotification } from '../types/notification';
import { notificationService } from '../services/notificationService';
import { WhatsAppNotifier } from '../utils/whatsAppNotifier';
import {
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  User,
  Share2,
  X,
  ArrowRight,
  Sparkles,
  Building2,
} from 'lucide-react';
import { toMarathiDigits } from '../utils/receiptCanvasGenerator';

interface NotificationBannerProps {
  banner: AppNotification | null;
  onNavigate?: (tab: string, meta?: any) => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  banner,
  onNavigate,
}) => {
  if (!banner) return null;

  const isIncome = banner.type === 'transaction_income';
  const isExpense = banner.type === 'transaction_expense';
  const isTask = banner.type === 'task_assigned' || banner.type === 'task_obstacle' || banner.type === 'task_status';
  const isSettlement = banner.type === 'settlement';
  const isObstacle = banner.type === 'task_obstacle';

  const handleAction = () => {
    notificationService.dismissBanner();
    if (banner.targetTab && onNavigate) {
      onNavigate(banner.targetTab, {
        memberId: banner.memberId,
        occasionId: banner.occasionId,
        transactionId: banner.transactionId,
      });
    }
  };

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (banner.whatsAppMessage) {
      WhatsAppNotifier.shareToWhatsApp(banner.whatsAppMessage, banner.memberPhone);
    }
  };

  const getCardTheme = () => {
    if (isIncome) {
      return {
        gradient: 'from-emerald-900 via-emerald-950 to-slate-950 border-emerald-500/70',
        badgeBg: 'bg-emerald-500 text-slate-950 font-black shadow-emerald-500/50',
        icon: <IndianRupee className="w-5 h-5 text-emerald-300" />,
        typeLabel: 'GPay जमा सूचना',
      };
    }
    if (isExpense) {
      return {
        gradient: 'from-rose-900 via-rose-950 to-slate-950 border-rose-500/70',
        badgeBg: 'bg-rose-500 text-white font-bold',
        icon: <IndianRupee className="w-5 h-5 text-rose-300" />,
        typeLabel: 'खर्च नोंद',
      };
    }
    if (isObstacle) {
      return {
        gradient: 'from-amber-900 via-red-950 to-slate-950 border-amber-500/70',
        badgeBg: 'bg-amber-500 text-slate-950 font-bold',
        icon: <AlertTriangle className="w-5 h-5 text-amber-300 animate-pulse" />,
        typeLabel: 'कामात अडचण',
      };
    }
    if (isTask) {
      return {
        gradient: 'from-blue-900 via-indigo-950 to-slate-950 border-cyan-500/70',
        badgeBg: 'bg-cyan-500 text-slate-950 font-bold',
        icon: <ClipboardList className="w-5 h-5 text-cyan-300" />,
        typeLabel: 'कामाचे नियोजन',
      };
    }
    if (isSettlement) {
      return {
        gradient: 'from-purple-900 via-indigo-950 to-slate-950 border-purple-500/70',
        badgeBg: 'bg-purple-500 text-white font-bold',
        icon: <Building2 className="w-5 h-5 text-purple-300" />,
        typeLabel: 'कॅश भरणा',
      };
    }
    return {
      gradient: 'from-amber-900 via-slate-900 to-slate-950 border-amber-500/70',
      badgeBg: 'bg-amber-500 text-slate-950 font-bold',
      icon: <User className="w-5 h-5 text-amber-300" />,
      typeLabel: 'प्रोफाइल अपडेट',
    };
  };

  const theme = getCardTheme();

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[94%] max-w-lg animate-bounce-short shadow-2xl transition-all duration-300">
      <div
        className={`bg-gradient-to-r ${theme.gradient} border-2 rounded-2xl p-3.5 sm:p-4 text-white shadow-2xl backdrop-blur-md relative overflow-hidden`}
      >
        {/* Top Glow Accent */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3 relative z-10">
          {/* Visual Icon Badge */}
          <div className="w-10 h-10 rounded-xl bg-slate-900/90 border border-white/20 flex items-center justify-center shrink-0 shadow-md">
            {theme.icon}
          </div>

          {/* Main Notification Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs ${theme.badgeBg}`}>
                {theme.typeLabel}
              </span>
              {banner.amount ? (
                <span className="text-xs font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                  ₹ {toMarathiDigits(Number(banner.amount).toLocaleString('en-IN'))}/-
                </span>
              ) : null}
              <span className="text-[10px] text-slate-400 ml-auto">आत्ताच</span>
            </div>

            <h4 className="text-xs sm:text-sm font-bold text-white leading-snug truncate">
              {banner.title}
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-200 line-clamp-2 mt-0.5">
              {banner.message}
            </p>

            {/* Action Buttons Row */}
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              {banner.targetTab && (
                <button
                  type="button"
                  onClick={handleAction}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg transition-all flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
                >
                  <span>पाहा (View)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {banner.whatsAppMessage && (
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
                  title="WhatsApp वर थेट पाठवा"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp पाठवा</span>
                </button>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => notificationService.dismissBanner()}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
