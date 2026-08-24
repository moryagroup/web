import React, { useState } from 'react';
import { AppNotification, NotificationFilter } from '../types/notification';
import { notificationService } from '../services/notificationService';
import { soundService } from '../services/soundService';
import { WhatsAppNotifier } from '../utils/whatsAppNotifier';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  Volume2,
  VolumeX,
  Share2,
  ArrowRight,
  IndianRupee,
  ClipboardList,
  AlertTriangle,
  User,
  Building2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { toMarathiDigits, formatMarathiDate } from '../utils/receiptCanvasGenerator';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onNavigate?: (tab: string, meta?: any) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onNavigate,
}) => {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [isMuted, setIsMuted] = useState<boolean>(soundService.isSoundMuted());
  const pushPermission = notificationService.getPushPermissionStatus();

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'transactions') {
      return n.type === 'transaction_income' || n.type === 'transaction_expense' || n.type === 'settlement';
    }
    if (filter === 'tasks') {
      return n.type === 'task_assigned' || n.type === 'task_obstacle' || n.type === 'task_status';
    }
    if (filter === 'profile') {
      return n.type === 'profile_update' || n.type === 'settlement';
    }
    return true;
  });

  const handleToggleSound = () => {
    const nextMuted = soundService.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      soundService.playGPayChime();
    }
  };

  const handleRequestPush = async () => {
    await notificationService.requestPushPermission();
  };

  const handleItemClick = (n: AppNotification) => {
    notificationService.markAsRead(n.id);
    if (n.targetTab && onNavigate) {
      onClose();
      onNavigate(n.targetTab, {
        memberId: n.memberId,
        occasionId: n.occasionId,
        transactionId: n.transactionId,
      });
    }
  };

  const handleWhatsAppShare = (e: React.MouseEvent, n: AppNotification) => {
    e.stopPropagation();
    if (n.whatsAppMessage) {
      WhatsAppNotifier.shareToWhatsApp(n.whatsAppMessage, n.memberPhone);
    }
  };

  const formatNotificationTime = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      const timeStr = date.toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = formatMarathiDate(isoStr.substring(0, 10));
      return `${dateStr}, ${toMarathiDigits(timeStr)}`;
    } catch {
      return 'आत्ताच';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-rose-950 to-orange-950 px-4 py-3 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-black rounded-full shadow-sm animate-pulse">
                  {toMarathiDigits(unreadCount)}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-1.5">
                सूचना केंद्र (Notification Center)
              </h3>
              <p className="text-[11px] text-amber-200/80">
                {unreadCount > 0
                  ? `${toMarathiDigits(unreadCount)} न वाचलेल्या सूचना`
                  : 'सर्व सूचना वाचल्या आहेत'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sound Mute/Unmute toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-950/60 border-rose-600 text-rose-300'
                  : 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
              }`}
              title={isMuted ? 'आवाज चालू करा (Unmute Sound)' : 'आवाज बंद करा (Mute Sound)'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Controls & Browser Push Notification Banner */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 space-y-2 shrink-0">
          {/* Push permission enable button if not granted */}
          {pushPermission === 'default' && (
            <div className="p-2.5 bg-amber-950/50 border border-amber-500/40 rounded-xl flex items-center justify-between gap-2">
              <div className="text-[11px] text-amber-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>मोबाईलवर थेट नोटीफिकेशन मिळवण्यासाठी परमिशन द्या</span>
              </div>
              <button
                type="button"
                onClick={handleRequestPush}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg shadow cursor-pointer active:scale-95 shrink-0"
              >
                सुरू करा
              </button>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filter === 'all' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                सर्व ({toMarathiDigits(notifications.length)})
              </button>
              <button
                type="button"
                onClick={() => setFilter('transactions')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filter === 'transactions' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                💰 व्यवहार
              </button>
              <button
                type="button"
                onClick={() => setFilter('tasks')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filter === 'tasks' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                📋 कामे
              </button>
              <button
                type="button"
                onClick={() => setFilter('profile')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filter === 'profile' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                👤 प्रोफाइल
              </button>
            </div>

            {/* Quick Bulk Actions */}
            <div className="flex items-center gap-1.5 ml-auto">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => notificationService.markAllAsRead()}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  title="सर्व वाचले म्हणून चिन्हांकित करा"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">सर्व वाचले</span>
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('सर्व सूचना हटवायच्या आहेत का?')) {
                      notificationService.clearAll();
                    }
                  }}
                  className="px-2 py-1 bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/40 text-rose-300 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  title="सर्व सूचना साफ करा"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">हटवा</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-300">कोणत्याही सूचना उपलब्ध नाहीत</p>
              <p className="text-xs text-slate-500">नवीन व्यवहार, कामे व प्रोफाइल हालचाली येथे दिसतील.</p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const isIncome = n.type === 'transaction_income';
              const isExpense = n.type === 'transaction_expense';
              const isObstacle = n.type === 'task_obstacle';
              const isTask = n.type === 'task_assigned' || n.type === 'task_status';
              const isSettlement = n.type === 'settlement';

              return (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                    n.isRead
                      ? 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                      : 'bg-slate-800/90 border-amber-500/50 hover:border-amber-400 shadow-md ring-1 ring-amber-500/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Category Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow ${
                        isIncome
                          ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                          : isExpense
                          ? 'bg-rose-950 border border-rose-500 text-rose-300'
                          : isObstacle
                          ? 'bg-red-950 border border-red-500 text-red-300'
                          : isTask
                          ? 'bg-cyan-950 border border-cyan-500 text-cyan-300'
                          : isSettlement
                          ? 'bg-purple-950 border border-purple-500 text-purple-300'
                          : 'bg-amber-950 border border-amber-500 text-amber-300'
                      }`}
                    >
                      {isIncome && <IndianRupee className="w-4 h-4" />}
                      {isExpense && <IndianRupee className="w-4 h-4" />}
                      {isObstacle && <AlertTriangle className="w-4 h-4" />}
                      {isTask && <ClipboardList className="w-4 h-4" />}
                      {isSettlement && <Building2 className="w-4 h-4" />}
                      {!isIncome && !isExpense && !isObstacle && !isTask && !isSettlement && (
                        <User className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${n.isRead ? 'text-slate-200' : 'text-amber-300'}`}>
                            {n.title}
                          </h4>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 shadow-xs animate-pulse" />
                          )}
                        </div>

                        {n.amount ? (
                          <span
                            className={`text-xs font-black px-2 py-0.5 rounded border shrink-0 ${
                              isIncome
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                                : 'bg-rose-950 text-rose-300 border-rose-600'
                            }`}
                          >
                            ₹ {toMarathiDigits(Number(n.amount).toLocaleString('en-IN'))}
                          </span>
                        ) : null}
                      </div>

                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-700/50">
                        <span className="text-[10px] text-slate-400">
                          {formatNotificationTime(n.createdAt)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {n.whatsAppMessage && (
                            <button
                              type="button"
                              onClick={(e) => handleWhatsAppShare(e, n)}
                              className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                              title="WhatsApp वर शेअर करा"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </button>
                          )}

                          {n.targetTab && (
                            <span className="text-[11px] font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-0.5">
                              <span>तपशील</span>
                              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              notificationService.deleteNotification(n.id);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                            title="ही सूचना हटवा"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
