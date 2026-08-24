import React, { useState, useMemo } from 'react';
import moryaLogo from '../assets/morya_logo.jpg';
import { LogoLightboxModal } from './LogoLightboxModal';
import {
  IncomeTransaction,
  ExpenseTransaction,
  FinancialYearSummary,
  Member,
  CurrentUser,
  EventGalleryImage,
  OccasionEvent,
  EventTask,
  CashSettlement,
} from '../types';
import { HeaderStats } from './HeaderStats';
import { EventGallerySection } from './EventGallerySection';
import { ProfilePhotoLightboxModal } from './ProfilePhotoLightboxModal';
import { ProofLightboxModal } from './ProofLightboxModal';
import { TaskObstacleModal } from './TaskObstacleModal';
import { isGoogleDriveUrl } from '../services/googleDriveService';
import { hasFullFinancialAccess, isBadgedMember, canViewRecentGroupTransactions, canApproveFinancialTransactions } from '../utils/rbac';
import { isDateInSelectedYear, getCalendarYearFromDate } from '../utils/dateUtils';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle,
  XCircle,
  PlusCircle,
  Users,
  ShieldAlert,
  ChevronRight,
  LogOut,
  LogIn,
  Lock,
  Maximize2,
  User,
  Camera,
  ListChecks,
  Paperclip,
  AlertTriangle,
  MessageSquare,
  Trash2,
} from 'lucide-react';

interface DashboardViewProps {
  summary: FinancialYearSummary;
  incomes: IncomeTransaction[];
  expenses: ExpenseTransaction[];
  cashSettlements?: CashSettlement[];
  members: Member[];
  occasions?: OccasionEvent[];
  currentUser: CurrentUser;
  gallery: EventGalleryImage[];
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  groupLogo?: string;
  onSaveGallery: (gallery: EventGalleryImage[]) => void;
  onNavigate: (tab: string) => void;
  onApproveExpense: (expId: string, name: string, role: any) => void;
  onRejectExpense?: (expId: string, name: string, role: any) => void;
  onApproveIncome?: (incId: string, name: string, role: any) => void;
  onRejectIncome?: (incId: string, name: string, role: any) => void;
  onApproveCashSettlement?: (id: string, name: string, role: any) => void;
  onRejectCashSettlement?: (id: string, name: string, role: any) => void;
  onDeleteCashSettlement?: (id: string) => void;
  onLogout?: () => void;
  onOpenLogin?: () => void;
  onUpdateOccasion?: (occasion: OccasionEvent) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  incomes,
  expenses,
  cashSettlements = [],
  members,
  occasions = [],
  currentUser,
  gallery,
  selectedYear,
  setSelectedYear,
  groupLogo,
  onSaveGallery,
  onNavigate,
  onApproveExpense,
  onRejectExpense,
  onApproveIncome,
  onRejectIncome,
  onApproveCashSettlement,
  onRejectCashSettlement,
  onDeleteCashSettlement,
  onLogout,
  onOpenLogin,
  onUpdateOccasion,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isMemberPhotoModalOpen, setIsMemberPhotoModalOpen] = useState(false);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);

  const handleProofClick = (url: string) => {
    if (!url) return;
    if (isGoogleDriveUrl(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      setProofModalUrl(url);
    }
  };
  const isFullAccess = hasFullFinancialAccess(currentUser.role);
  const isBadged = isBadgedMember(currentUser.role);

  const currentMember = useMemo(() => {
    const list = Array.isArray(members) ? members : [];
    const userName = (currentUser?.name || '').trim().toLowerCase();
    const userPhone = currentUser?.phone || '';
    return list.find((m) => {
      if (!m) return false;
      const memName = (m.fullName || '').trim().toLowerCase();
      const memPhone = m.phone || '';
      return (
        (userName && memName === userName) ||
        (userPhone && memPhone === userPhone) ||
        (userName && memName && (memName.includes(userName) || userName.includes(memName)))
      );
    });
  }, [members, currentUser]);

  const memberPhoto = currentMember?.photoUrl;
  const [activeObstacleModal, setActiveObstacleModal] = useState<{ task: EventTask; occasion: OccasionEvent } | null>(null);

  // Helper to normalize strings for robust comparison across English/Marathi names
  const normalizeText = (str?: string) =>
    (str || '').toLowerCase().replace(/\s+/g, '').replace(/[()]/g, '').trim();

  // Compute assigned tasks for the currently logged in member (sub-tasks + main occasion responsibilities)
  const assignedTasksForMe = useMemo(() => {
    if (!currentUser || currentUser.isLoggedIn === false) return [];
    const myTasks: Array<{ occasion: OccasionEvent; task: EventTask }> = [];
    const userNorm = normalizeText(currentUser?.name);
    const memberNorm = normalizeText(currentMember?.fullName);
    const memberCodeNorm = normalizeText(currentMember?.memberCode);

    (occasions || []).forEach((occ) => {
      // 1. Check Sub-tasks array (occ.tasks)
      (occ.tasks || []).forEach((t) => {
        const taskNameNorm = normalizeText(t.assignedMemberName);
        const matchesMemberId = Boolean(currentMember && t.assignedMemberId && t.assignedMemberId === currentMember.id);
        const matchesPhone = Boolean(currentMember && t.assignedMemberPhone && currentMember.phone && t.assignedMemberPhone === currentMember.phone);
        const matchesName = Boolean(
          (taskNameNorm && userNorm && (taskNameNorm === userNorm || taskNameNorm.includes(userNorm) || userNorm.includes(taskNameNorm))) ||
          (taskNameNorm && memberNorm && (taskNameNorm === memberNorm || taskNameNorm.includes(memberNorm) || memberNorm.includes(taskNameNorm))) ||
          (taskNameNorm && memberCodeNorm && taskNameNorm.includes(memberCodeNorm))
        );

        const isTeamMember = (t.teamMembers || []).some((tm) => {
          const tmIdMatch = Boolean(currentMember && tm.id === currentMember.id);
          const tmNameNorm = normalizeText(tm.name);
          const tmNameMatch = Boolean(
            (tmNameNorm && userNorm && (tmNameNorm === userNorm || tmNameNorm.includes(userNorm) || userNorm.includes(tmNameNorm))) ||
            (tmNameNorm && memberNorm && (tmNameNorm === memberNorm || tmNameNorm.includes(memberNorm) || memberNorm.includes(tmNameNorm)))
          );
          return tmIdMatch || tmNameMatch;
        });

        if (matchesMemberId || matchesPhone || matchesName || isTeamMember) {
          myTasks.push({ occasion: occ, task: t });
        }
      });

      // 2. Check Occasion-level Main Responsible Manager (occ.responsiblePerson)
      const occRespNorm = normalizeText(occ.responsiblePerson);
      if (occRespNorm) {
        const matchesRespName = Boolean(
          (userNorm && (occRespNorm === userNorm || occRespNorm.includes(userNorm) || userNorm.includes(occRespNorm))) ||
          (memberNorm && (occRespNorm === memberNorm || occRespNorm.includes(memberNorm) || memberNorm.includes(occRespNorm)))
        );

        if (matchesRespName) {
          const alreadyInSubTasks = myTasks.some((item) => item.occasion.id === occ.id);
          if (!alreadyInSubTasks) {
            myTasks.push({
              occasion: occ,
              task: {
                id: `occ-main-${occ.id}`,
                taskTitle: occ.workDetails || `प्रमुख उत्सव जबाबदारी: ${occ.name}`,
                assignedMemberId: currentMember?.id || '',
                assignedMemberName: occ.responsiblePerson || currentUser.name,
                assignedMemberRole: currentMember?.designation || 'उत्सव प्रमुख',
                assignedMemberPhone: currentMember?.phone || '',
                status: 'प्रक्रियेत',
                notes: 'उत्सव प्रमुख जबाबदार व्यक्ती',
              },
            });
          }
        }
      }
    });

    return myTasks;
  }, [occasions, currentUser, currentMember]);

  const canApprove =
    canApproveFinancialTransactions(currentUser.role) ||
    currentUser.role === 'खजिनदार' ||
    currentUser.role === 'उपखजिनदार' ||
    // Also check the live members list designation (in case stored session role is stale)
    canApproveFinancialTransactions(currentMember?.designation) ||
    currentMember?.designation === 'खजिनदार' ||
    currentMember?.designation === 'उपखजिनदार' ||
    (currentUser.name && (
      currentUser.name.includes('उदय') ||
      currentUser.name.includes('हेरवाडे') ||
      currentUser.name.includes('संकेत') ||
      currentUser.name.includes('कौले')
    ));

  const activeYear = selectedYear || getCalendarYearFromDate(new Date().toISOString().split('T')[0]);

  const displayIncomes = useMemo(() => {
    if (!Array.isArray(incomes)) return [];
    const yearIncomes = incomes.filter((i) =>
      isDateInSelectedYear(i.transactionDate, activeYear, i.financialYear)
    );
    if (canApprove) return yearIncomes;
    const userNorm = (currentUser?.name || '').trim().toLowerCase();
    return yearIncomes.filter(
      (i) =>
        (currentMember && i.linkedMemberId === currentMember.id) ||
        (i.depositorName || '').trim().toLowerCase().includes(userNorm) ||
        (i.createdBy || '').trim().toLowerCase().includes(userNorm)
    );
  }, [incomes, canApprove, currentMember, currentUser, activeYear]);

  const displayExpenses = useMemo(() => {
    if (!Array.isArray(expenses)) return [];
    const yearExpenses = expenses.filter((e) =>
      isDateInSelectedYear(e.expenseDate, activeYear, e.financialYear)
    );
    if (canApprove) return yearExpenses;
    const userNorm = (currentUser?.name || '').trim().toLowerCase();
    return yearExpenses.filter(
      (e) =>
        (currentMember && e.linkedMemberId === currentMember.id) ||
        (e.recipientName || '').trim().toLowerCase().includes(userNorm) ||
        (e.createdBy || '').trim().toLowerCase().includes(userNorm)
    );
  }, [expenses, canApprove, currentMember, currentUser, activeYear]);

  // User's personal total deposits and expenses for the Selected/Current Year (Total, Online & Cash)
  const userPersonalSummary = useMemo(() => {
    if (!currentUser || !currentUser.name) {
      return {
        totalDeposit: 0,
        onlineDeposit: 0,
        cashDeposit: 0,
        totalExpense: 0,
        onlineExpense: 0,
        cashExpense: 0,
        depositCount: 0,
        expenseCount: 0,
        activeYear: '२०२६',
      };
    }

    const userNorm = (currentUser.name || '').trim().toLowerCase();
    const activeYear = selectedYear || getCalendarYearFromDate(new Date().toISOString().split('T')[0]);

    const userIncomes = (incomes || []).filter((i) => {
      if (i.approvalStatus === 'रद्द') return false;
      if (!isDateInSelectedYear(i.transactionDate, activeYear, i.financialYear)) return false;
      const isLinked = Boolean(currentMember && i.linkedMemberId === currentMember.id);
      const isDepositor = (i.depositorName || '').trim().toLowerCase().includes(userNorm);
      const isCreator = (i.createdBy || '').trim().toLowerCase().includes(userNorm);
      return isLinked || isDepositor || isCreator;
    });

    const totalDeposit = userIncomes.reduce((sum, i) => sum + i.amount, 0);
    const onlineDeposit = userIncomes
      .filter((i) => i.paymentMethod !== 'रोख')
      .reduce((sum, i) => sum + i.amount, 0);
    const cashDeposit = userIncomes
      .filter((i) => i.paymentMethod === 'रोख')
      .reduce((sum, i) => sum + i.amount, 0);

    const userExpenses = (expenses || []).filter((e) => {
      if (e.approvalStatus === 'रद्द') return false;
      if (!isDateInSelectedYear(e.expenseDate, activeYear, e.financialYear)) return false;
      const isLinked = Boolean(currentMember && (e.linkedMemberId === currentMember.id || e.paidByMemberId === currentMember.id));
      const isRecipient = (e.recipientName || '').trim().toLowerCase().includes(userNorm);
      const isPaidBy = (e.paidByMemberName || '').trim().toLowerCase().includes(userNorm);
      const isCreator = (e.createdBy || '').trim().toLowerCase().includes(userNorm);
      return isLinked || isRecipient || isPaidBy || isCreator;
    });

    const totalExpense = userExpenses.reduce((sum, e) => sum + e.amount, 0);
    const onlineExpense = userExpenses
      .filter((e) => e.paymentMethod !== 'रोख')
      .reduce((sum, e) => sum + e.amount, 0);
    const cashExpense = userExpenses
      .filter((e) => e.paymentMethod === 'रोख')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalDeposit,
      onlineDeposit,
      cashDeposit,
      totalExpense,
      onlineExpense,
      cashExpense,
      depositCount: userIncomes.length,
      expenseCount: userExpenses.length,
      activeYear,
    };
  }, [incomes, expenses, currentUser, currentMember, selectedYear]);

  const recentIncomes = displayIncomes.slice(0, 5);
  const recentExpenses = displayExpenses.slice(0, 5);

  const pendingIncomes = canApprove
    ? incomes.filter((i) => i.approvalStatus === 'प्रलंबित')
    : [];

  const pendingCashSettlements = canApprove
    ? (cashSettlements || []).filter((s) => s.approvalStatus === 'प्रलंबित')
    : [];

  const pendingExpenses = canApprove
    ? expenses.filter((e) => e.approvalStatus === 'प्रलंबित')
    : [];

  const isLoggedIn = currentUser.isLoggedIn !== false;

  if (!isLoggedIn) {
    return (
      <div className="space-y-6 my-2">
        {/* Guest Public Welcome Banner with Middle Login Option */}
        <div className="bg-gradient-to-r from-[#0F172A] via-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md border border-slate-700/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <img
                src={groupLogo || moryaLogo}
                alt="मोरया ग्रुप मित्र मंडळ (ट्रस्ट) लोगो"
                onClick={() => setIsLightboxOpen(true)}
                title="मोठा लोगो पहा (WhatsApp Style)"
                className="w-20 h-20 object-contain rounded-full border-2 border-amber-400 p-0.5 bg-slate-950 shadow-xl cursor-pointer transition-transform group-hover:scale-105"
              />
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                title="मोठा लोगो पहा"
                className="absolute top-0 right-0 bg-slate-900/80 text-amber-400 p-1 rounded-full border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md text-[11px] font-bold uppercase tracking-wider">
                  सार्वजनिक उत्सव दालन (Public View)
                </span>
                <span className="text-xs text-amber-400 font-bold">• हडपसर गोंधळनगर</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black mt-1 text-white">
                मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                मंडळाच्या गणेशोत्सव, विसर्जन मिरवणूक, भव्य महाप्रसाद, रक्तदान शिबीर, क्रीडा स्पर्धा व सामाजिक उपक्रमांचे डिजिटल फोटो दालन.
              </p>
            </div>
          </div>
        </div>

        {/* Income, Expense & Net Balance Summary Cards (Positioned directly below the Middle Login option) */}
        {hasFullFinancialAccess(currentUser.role) && (
          <HeaderStats
            summary={summary}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            currentUser={currentUser}
            onLogout={onLogout}
          />
        )}

        {/* Event Photo Gallery */}
        <EventGallerySection
          gallery={gallery}
          onSaveGallery={onSaveGallery}
          currentUser={currentUser}
          onOpenLogin={onOpenLogin}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 my-1">
      {/* Compact User Greeting Header (Only Attached Image Data - Mobile-Optimized Small Box) */}
      <div className="bg-gradient-to-r from-amber-950 via-[#3a0a0f] to-orange-950 text-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-md border border-amber-500/30 flex items-center gap-3 sm:gap-4">
        {/* Logged-in Member Profile Photo Badge */}
        {isLoggedIn && (
          <div
            className="relative group cursor-pointer shrink-0"
            onClick={() => setIsMemberPhotoModalOpen(true)}
            title="मोठा प्रोफाईल फोटो पहा"
          >
            {memberPhoto ? (
              <img
                src={memberPhoto}
                alt={currentUser.name}
                className="w-11 h-11 sm:w-13 sm:h-13 object-cover rounded-full border-2 border-amber-400 p-0.5 bg-slate-950 shadow-md group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full border-2 border-amber-400/90 bg-amber-500/20 flex flex-col items-center justify-center text-amber-300 font-bold shadow-md group-hover:scale-105 transition-transform">
                <User className="w-5 h-5 text-amber-400" />
                <span className="text-[7px] font-bold text-amber-200">फोटो जोडा</span>
              </div>
            )}
            <div
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('profile');
              }}
              className="absolute -bottom-0.5 -right-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 p-0.5 sm:p-1 rounded-full border border-amber-300 shadow-xs group-hover:scale-110 transition-transform"
              title="फोटो बदला"
            >
              <Camera className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
              {currentUser.role} लॉगइन
            </span>
          </div>
          <h2 className="text-sm sm:text-base md:text-lg font-black text-white flex items-center gap-1.5 truncate mt-0.5">
            नमस्कार, {currentUser.name}! 🙏
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-300 mt-0.5 leading-snug">
            <strong className="text-amber-300">हडपसर गोंधळनगर</strong> — सर्व उत्पन्न, वर्गणी, प्रायोजकत्व व खर्चाची अधिकृत डिजिटल हिशोब नोंदणी प्रणाली.
          </p>
        </div>
      </div>

      {/* Income, Expense & Net Balance Summary Cards (Only for Treasurer & Vice Treasurer) */}
      {hasFullFinancialAccess(currentUser.role) && (
        <HeaderStats
          summary={summary}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          currentUser={currentUser}
          onLogout={onLogout}
          onNavigate={onNavigate}
        />
      )}

      {/* User's Personal Total Deposit & Total Expense Cards (Side by Side) */}
      {/* User's Personal Total Deposit & Total Expense Cards (Side by Side in One Small Box) */}
      {isLoggedIn && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs p-2 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* User's Total Deposit Card */}
            <div
              onClick={() => onNavigate('income-history')}
              className="bg-gradient-to-br from-emerald-50 to-teal-50/70 hover:from-emerald-100/90 hover:to-teal-100/80 dark:from-emerald-950/40 dark:to-teal-950/30 dark:hover:from-emerald-900/50 dark:hover:to-teal-900/40 p-2.5 sm:p-3.5 rounded-xl border border-emerald-200/80 hover:border-emerald-400 dark:border-emerald-800/60 dark:hover:border-emerald-600 shadow-2xs hover:shadow-md transition-all cursor-pointer active:scale-[0.99] flex flex-col justify-between group"
              title="जमा इतिहास पहा (Click to view Income History)"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">
                    <ArrowDownCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">तुमची एकूण जमा (Deposit)</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    {userPersonalSummary.depositCount} नोंदी &rsaquo;
                  </span>
                </div>
                <p className="text-lg sm:text-2xl font-black text-emerald-900 dark:text-emerald-100 tracking-tight">
                  ₹{userPersonalSummary.totalDeposit.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-[9px] sm:text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex-wrap gap-x-1">
                <span className="flex items-center gap-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400">🌐 ऑन:</span>
                  <span className="font-extrabold text-emerald-950 dark:text-emerald-100">
                    ₹{userPersonalSummary.onlineDeposit.toLocaleString('en-IN')}
                  </span>
                </span>
                <span className="text-emerald-300 dark:text-emerald-700 hidden sm:inline">|</span>
                <span className="flex items-center gap-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400">💵 रोख:</span>
                  <span className="font-extrabold text-emerald-950 dark:text-emerald-100">
                    ₹{userPersonalSummary.cashDeposit.toLocaleString('en-IN')}
                  </span>
                </span>
              </div>
            </div>

            {/* User's Total Expense Card */}
            <div
              onClick={() => onNavigate('expense-history')}
              className="bg-gradient-to-br from-rose-50 to-red-50/70 hover:from-rose-100/90 hover:to-red-100/80 dark:from-rose-950/40 dark:to-red-950/30 dark:hover:from-rose-900/50 dark:hover:to-red-900/40 p-2.5 sm:p-3.5 rounded-xl border border-rose-200/80 hover:border-rose-400 dark:border-rose-800/60 dark:hover:border-rose-600 shadow-2xs hover:shadow-md transition-all cursor-pointer active:scale-[0.99] flex flex-col justify-between group"
              title="खर्च इतिहास पहा (Click to view Expense History)"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-rose-800 dark:text-rose-300 truncate">
                    <ArrowUpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">तुमचा एकूण खर्च (Expense)</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] bg-rose-200/70 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    {userPersonalSummary.expenseCount} नोंदी &rsaquo;
                  </span>
                </div>
                <p className="text-lg sm:text-2xl font-black text-rose-900 dark:text-rose-100 tracking-tight">
                  ₹{userPersonalSummary.totalExpense.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-rose-200/60 dark:border-rose-800/40 flex items-center justify-between text-[9px] sm:text-[11px] font-bold text-rose-800 dark:text-rose-300 flex-wrap gap-x-1">
                <span className="flex items-center gap-0.5">
                  <span className="text-rose-600 dark:text-rose-400">🌐 ऑन:</span>
                  <span className="font-extrabold text-rose-950 dark:text-rose-100">
                    ₹{userPersonalSummary.onlineExpense.toLocaleString('en-IN')}
                  </span>
                </span>
                <span className="text-rose-300 dark:text-rose-700 hidden sm:inline">|</span>
                <span className="flex items-center gap-0.5">
                  <span className="text-rose-600 dark:text-rose-400">💵 रोख:</span>
                  <span className="font-extrabold text-rose-950 dark:text-rose-100">
                    ₹{userPersonalSummary.cashExpense.toLocaleString('en-IN')}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Home Page Notification: Assigned Event Tasks & Work Responsibilities */}
      {assignedTasksForMe.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/10 via-purple-500/15 to-indigo-600/10 dark:from-slate-900 dark:via-purple-950/70 dark:to-indigo-950/80 p-5 sm:p-6 rounded-3xl border-2 border-purple-400/50 dark:border-purple-500/40 shadow-xl space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-200/60 dark:border-purple-900/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
                <ListChecks className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-400/40 rounded-md text-[11px] font-black uppercase">
                    कामाची जबाबदारी
                  </span>
                  <span className="px-2 py-0.5 bg-purple-600 text-white font-black rounded-full text-[10px] shadow-2xs">
                    {assignedTasksForMe.length} {assignedTasksForMe.length === 1 ? 'काम' : 'कामे'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  तुमच्याकडे सोपवलेली उत्सव कामांची जबाबदारी
                </h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-purple-200 font-medium">
              मंडळ व्यवस्थापनाने उत्सवात तुमच्या नावावर खालील प्रमुख कामांची जबाबदारी दिली आहे:
            </p>
          </div>

          {/* Grid of Task Cards */}
          <div className={`grid gap-4 ${assignedTasksForMe.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {assignedTasksForMe.map(({ occasion, task }) => (
              <div
                key={task.id}
                className="bg-white/95 dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border-2 border-purple-200/80 dark:border-purple-900/60 hover:border-amber-400 dark:hover:border-amber-500/60 shadow-md hover:shadow-xl transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  {/* Top row: Occasion Badge + Status Pill */}
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1">
                      🎉 {occasion.name} ({occasion.year})
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black border shadow-2xs flex items-center gap-1 ${
                        task.status === 'पूर्ण'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                          : task.status === 'प्रक्रियेत'
                          ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                          : task.status === 'अडचण / समस्या'
                          ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700 animate-pulse'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      }`}
                    >
                      {task.status === 'पूर्ण' && '✓ '}
                      {task.status === 'अडचण / समस्या' && '⚠️ '}
                      {task.status}
                    </span>
                  </div>

                  {/* Task Title */}
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-amber-300">
                      {task.taskTitle}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300">👤 प्रमुख व्यवस्थापक:</span>
                      <span className="font-extrabold text-indigo-700 dark:text-amber-200">{task.assignedMemberName}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">({task.assignedMemberRole || 'सभासद'})</span>
                    </p>
                  </div>

                  {/* Latest Progress Update Box */}
                  {task.progressUpdates && task.progressUpdates.length > 0 && (
                    <div className="p-2.5 bg-blue-50/80 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700 rounded-xl text-xs space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] text-blue-900 dark:text-blue-300 font-bold">
                        <span className="flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 text-blue-600" />
                          सद्यस्थिती / प्रगती (नवीनतम):
                        </span>
                        <span className="text-[9px] text-slate-400">{task.progressUpdates[0].createdAt}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 italic">
                        "{task.progressUpdates[0].progressNote}"
                        <span className="text-[10px] font-normal text-slate-500 not-italic block mt-0.5">
                          — {task.progressUpdates[0].memberName} ({task.progressUpdates[0].memberRole || 'सभासद'})
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Obstacle Detail Box */}
                  {task.status === 'अडचण / समस्या' && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700/60 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 animate-bounce" />
                        <span>कामात अडचण आल्याने थांबले आहे</span>
                      </div>
                      {task.obstacleDetails && (
                        <p className="text-xs text-rose-700 dark:text-rose-200 italic font-medium">
                          "{task.obstacleDetails}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons Row */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveObstacleModal({ task, occasion })}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>
                      + प्रगती नोंदवा
                      {(task.progressUpdates?.length || 0) > 0 ? ` (${task.progressUpdates?.length})` : ''}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveObstacleModal({ task, occasion })}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>
                      {task.status === 'अडचण / समस्या' ? '⚠️ अडचण / सूचना' : '💬 तपशील / सूचना'}
                      {(task.suggestions?.length || 0) > 0 ? ` (${task.suggestions?.length})` : ''}
                    </span>
                  </button>

                  {onUpdateOccasion && (
                    <button
                      type="button"
                      onClick={() => {
                        const newStatus = task.status === 'पूर्ण' ? 'प्रलंबित' : 'पूर्ण';
                        let updatedTasks = [...(occasion.tasks || [])];
                        if (task.id.startsWith('occ-main-')) {
                          const existingIdx = updatedTasks.findIndex((t) => t.id === task.id);
                          if (existingIdx >= 0) {
                            updatedTasks[existingIdx] = { ...updatedTasks[existingIdx], status: newStatus as any };
                          } else {
                            updatedTasks.push({ ...task, status: newStatus as any });
                          }
                        } else {
                          updatedTasks = updatedTasks.map((t) =>
                            t.id === task.id ? { ...t, status: newStatus as any } : t
                          );
                        }
                        onUpdateOccasion({ ...occasion, tasks: updatedTasks });
                      }}
                      className={`px-3.5 py-2 font-black text-xs rounded-xl border shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                        task.status === 'पूर्ण'
                          ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-md'
                      }`}
                    >
                      {task.status === 'पूर्ण' ? 'पुन्हा उघडा' : '✓ पूर्ण म्हणून चिन्हांकित करा'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Income / Deposit Approvals Banner */}
      {pendingIncomes.length > 0 && (
        <div className="bg-emerald-50 dark:bg-slate-800/90 border border-emerald-200 dark:border-emerald-700/60 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-200/60 dark:border-emerald-700/60">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-bounce" />
              <span>जमा / डिपॉझिट मंजुरी प्रलंबित ({pendingIncomes.length} व्यवहार)</span>
            </div>
            <button
              onClick={() => onNavigate('income-history')}
              className="text-xs text-emerald-800 dark:text-emerald-300 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>सर्व प्रलंबित जमा पहा</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {pendingIncomes.map((inc) => (
              <div
                key={inc.id}
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{inc.depositorName}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      ({inc.incomeType} - {inc.reason})
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-600 text-[10px] font-bold">
                      {inc.paymentMethod}
                    </span>
                    {inc.paymentMethod === 'रोख' && inc.cashReceiverName && (
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold">
                        💵 रोख स्वीकारक: {inc.cashReceiverName}
                      </span>
                    )}
                    {inc.attachmentUrl ? (
                      <button
                        type="button"
                        onClick={() => handleProofClick(inc.attachmentUrl!)}
                        className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-400 dark:border-emerald-700 rounded-lg text-[11px] font-bold flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-900 shadow-2xs transition-all active:scale-95 cursor-pointer"
                        title="पावती पुरावा पहा (Click to view attachment proof)"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        <span>📎 जमा पावती पुरावा पाहा</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-amber-800 dark:text-amber-300 italic bg-amber-100/70 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                        (कोणताही पुरावा जोडलेला नाही)
                      </span>
                    )}
                  </div>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    तारीख: {inc.transactionDate} {inc.receiptNumber ? `| पावती क्र: ${inc.receiptNumber}` : ''} {inc.paymentReference ? `| संदर्भ: ${inc.paymentReference}` : ''} | नोंद: {inc.createdBy}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                    + ₹{inc.amount.toLocaleString('en-IN')}
                  </span>
                  {canApprove && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onApproveIncome && onApproveIncome(inc.id, currentUser.name, currentUser.role)}
                        className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                        title="पावती मंजूर करा"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>मंजूर</span>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`पावती क्र. ${inc.transactionNo || ''} (₹${inc.amount}) नाकारायची / रद्द करायची आहे का?`)) {
                            onRejectIncome && onRejectIncome(inc.id, currentUser.name, currentUser.role);
                          }
                        }}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                        title="पावती नाकारा / रद्द करा (Decline)"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>नाकारा</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Bank Deposit / Cash Settlement Approvals Banner */}
      {pendingCashSettlements.length > 0 && (
        <div className="bg-sky-50 dark:bg-slate-800/90 border border-sky-200 dark:border-sky-700/60 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-sky-200/60 dark:border-sky-700/60">
            <div className="flex items-center gap-2 text-sky-900 dark:text-sky-300 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-sky-600 dark:text-sky-400 animate-bounce" />
              <span>बँक भरणा / रोख सुपूर्द मंजुरी प्रलंबित ({pendingCashSettlements.length} व्यवहार)</span>
            </div>
            <button
              onClick={() => onNavigate('cash-settlements')}
              className="text-xs text-sky-800 dark:text-sky-300 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>सर्व भरणा नोंदी पहा</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {pendingCashSettlements.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-sky-200/80 dark:border-sky-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{s.memberName}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      (गंतव्य: {s.destination})
                    </span>
                    <span className="px-2 py-0.5 bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 rounded border border-sky-300 dark:border-sky-700 text-[10px] font-bold">
                      {s.settlementNo || 'बँक भरणा'}
                    </span>
                    {s.slipPhotoUrl ? (
                      <button
                        type="button"
                        onClick={() => handleProofClick(s.slipPhotoUrl!)}
                        className="px-2.5 py-1 bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-200 border border-sky-400 dark:border-sky-700 rounded-lg text-[11px] font-bold flex items-center gap-1 hover:bg-sky-200 dark:hover:bg-sky-900 shadow-2xs transition-all active:scale-95 cursor-pointer"
                        title="भरणा पावती स्लिप पहा"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
                        <span>📎 भरणा स्लिप फोटो पाहा</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">
                        (स्लिप फोटो जोडलेला नाही)
                      </span>
                    )}
                  </div>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    तारीख: {s.depositDate} {s.bankRefNo ? `| संदर्भ / स्लिप: ${s.bankRefNo}` : ''} | नोंदकर्ता: {s.createdBy}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-black text-sky-700 dark:text-sky-400 text-sm">
                    ₹{s.amount.toLocaleString('en-IN')}
                  </span>
                  {canApprove && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onApproveCashSettlement && onApproveCashSettlement(s.id, currentUser.name, currentUser.role)}
                        className="px-3 py-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                        title="भरणा मंजूर करा"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>मंजूर</span>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`बँक भरणा क्र. ${s.settlementNo || ''} (₹${s.amount}) नाकारायचा / रद्द करायचा आहे का?`)) {
                            onRejectCashSettlement && onRejectCashSettlement(s.id, currentUser.name, currentUser.role);
                          }
                        }}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                        title="भरणा नाकारा / रद्द करा"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>नाकारा</span>
                      </button>
                      {(currentUser.role === 'ॲडमिन' || currentUser.role === 'Admin' || currentMember?.designation === 'ॲडमिन' || currentMember?.designation === 'Admin') && onDeleteCashSettlement && (
                        <button
                          onClick={() => {
                            if (window.confirm(`बँक भरणा विनंती क्र. ${s.settlementNo || ''} (₹${s.amount}) पूर्णपणे हटवायची (Delete) आहे का?`)) {
                              onDeleteCashSettlement(s.id);
                            }
                          }}
                          className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/50 text-slate-500 rounded-xl transition-all cursor-pointer"
                          title="नोंद कायमची हटवा (Admin Only Delete)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Expense Approvals Banner (If any) */}
      {pendingExpenses.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-200/60">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600 animate-bounce" />
              <span>खर्च मंजुरी प्रलंबित ({pendingExpenses.length} व्यवहार)</span>
            </div>
            <button
              onClick={() => onNavigate('expense-history')}
              className="text-xs text-amber-800 hover:underline font-bold flex items-center gap-1"
            >
              <span>सर्व प्रलंबित खर्च पहा</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {pendingExpenses.map((exp) => (
              <div
                key={exp.id}
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-amber-200/80 dark:border-amber-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{exp.recipientName}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      ({exp.expenseCategory} - {exp.reason})
                    </span>
                    {exp.attachmentUrl ? (
                      <button
                        type="button"
                        onClick={() => handleProofClick(exp.attachmentUrl!)}
                        className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-400 rounded-lg text-[11px] font-bold flex items-center gap-1 hover:bg-emerald-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
                        title="पावती/बिल पुरावा पहा (Click to view attachment proof)"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-emerald-700" />
                        <span>📎 पावती/बिल पुरावा पाहा</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-amber-800 italic bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300">
                        (कोणताही पुरावा जोडलेला नाही)
                      </span>
                    )}
                  </div>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    तारीख: {exp.expenseDate} {exp.billNumber ? `| बिल क्र: ${exp.billNumber}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-black text-rose-700 text-sm">
                    ₹{exp.amount.toLocaleString('en-IN')}
                  </span>
                  {canApprove && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onApproveExpense(exp.id, currentUser.name, currentUser.role)}
                        className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                        title="खर्च मंजूर करा"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>मंजूर</span>
                      </button>
                      {onRejectExpense && (
                        <button
                          onClick={() => {
                            if (window.confirm(`खर्च क्र. ${exp.transactionNo || ''} (₹${exp.amount}) नाकारायचा / रद्द करायचा आहे का?`)) {
                              onRejectExpense(exp.id, currentUser.name, currentUser.role);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                          title="खर्च नाकारा / रद्द करा (Decline)"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>नाकारा</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid Layout: Recent Incomes & Expenses (Core Members / Admin Only) */}
      {canViewRecentGroupTransactions(currentUser.role) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {/* Recent Income Transactions */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                    अलीकडील जमा नोंदी
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('income-history')}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>
                    सर्व जमा ({displayIncomes.length})
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700 mt-2">
                {recentIncomes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    तुमच्याशी संबंधित कोणतीही जमा नोंद उपलब्ध नाही.
                  </p>
                ) : (
                  recentIncomes.map((item) => (
                    <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-800 dark:text-slate-100">{item.depositorName}</p>
                          {item.approvalStatus === 'मंजूर' ? (
                            <span className="px-2 py-0.5 bg-emerald-600 text-white border border-emerald-500 rounded-md text-[10px] font-black shadow-xs">
                              ✓ मंजूर
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-500 text-slate-950 border border-amber-400 rounded-md text-[10px] font-black shadow-xs">
                              ⏳ प्रलंबित
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-600">
                            {item.depositorType}
                          </span>
                          <span>• {item.incomeType}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                          + ₹{item.amount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-slate-400">{item.transactionDate}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => onNavigate('income-form')}
                className="w-full py-2 bg-slate-50 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-600 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-600 transition-colors cursor-pointer"
              >
                + नवीन जमा नोंद जोडा
              </button>
            </div>
          </div>

          {/* Recent Expense Transactions */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                    अलीकडील खर्च नोंदी
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('expense-history')}
                  className="text-xs font-bold text-rose-700 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>
                    सर्व खर्च ({displayExpenses.length})
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700 mt-2">
                {recentExpenses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    तुमच्याशी संबंधित कोणतीही खर्च नोंद उपलब्ध नाही.
                  </p>
                ) : (
                  recentExpenses.map((item) => (
                    <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-800 dark:text-slate-100">{item.recipientName}</p>
                          {item.approvalStatus === 'मंजूर' ? (
                            <span className="px-2 py-0.5 bg-emerald-600 text-white border border-emerald-500 rounded-md text-[10px] font-black shadow-xs">
                              ✓ मंजूर
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-500 text-slate-950 border border-amber-400 rounded-md text-[10px] font-black shadow-xs">
                              ⏳ प्रलंबित
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{item.expenseCategory}</span>
                          <span>• {item.reason}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-rose-700 text-sm">
                          - ₹{item.amount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-slate-400">{item.expenseDate}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={() => onNavigate('expense-form')}
                className="w-full py-2 bg-slate-50 hover:bg-rose-50 text-rose-800 font-bold text-xs rounded-xl border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
              >
                + नवीन खर्च नोंद जोडा
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Personal Transactions Section for Regular Members */
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <User className="w-5 h-5 text-amber-600" />
                माझे वैयक्तिक जमा व खर्च व्यवहार
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">तुमच्या खात्याशी संबंधित नोंदवलेले जमा व खर्च व्यवहार</p>
            </div>
            <button
              onClick={() => onNavigate('income-history')}
              className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>माझा संपूर्ण हिशोब</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {displayIncomes.filter(
              (i) =>
                (currentMember && i.linkedMemberId === currentMember.id) ||
                i.depositorName.trim().toLowerCase() === (currentUser.name || '').trim().toLowerCase()
            ).length === 0 &&
            displayExpenses.filter(
              (e) =>
                (currentMember && e.linkedMemberId === currentMember.id) ||
                e.recipientName.trim().toLowerCase() === (currentUser.name || '').trim().toLowerCase()
            ).length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                तुमच्या खात्यावर अद्याप कोणतेही जमा किंवा खर्च व्यवहार नोंदवलेले नाहीत.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayIncomes
                  .filter(
                    (i) =>
                      (currentMember && i.linkedMemberId === currentMember.id) ||
                      i.depositorName.trim().toLowerCase() === (currentUser.name || '').trim().toLowerCase()
                  )
                  .map((item) => (
                    <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{item.incomeType}</p>
                        <p className="text-[10px] text-slate-400">{item.transactionDate} • {item.reason}</p>
                      </div>
                      <p className="font-black text-emerald-700 text-sm">+ ₹{item.amount.toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                {displayExpenses
                  .filter(
                    (e) =>
                      (currentMember && e.linkedMemberId === currentMember.id) ||
                      e.recipientName.trim().toLowerCase() === (currentUser.name || '').trim().toLowerCase()
                  )
                  .map((item) => (
                    <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{item.expenseCategory}</p>
                        <p className="text-[10px] text-slate-400">{item.expenseDate} • {item.reason}</p>
                      </div>
                      <p className="font-black text-rose-700 text-sm">- ₹{item.amount.toLocaleString('en-IN')}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member Subscription Overview Teaser (Executive Badged Members Only) */}
      {isBadged && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">सभासद वर्गणी माहिती</h4>
              <p className="text-xs text-slate-500">
                एकूण {members.length} सभासद नोंदणीकृत आहेत. एकूण जमा वर्गणी: ₹
                {summary.totalSubscriptionsCollected.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('member-subscriptions')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
          >
            सभासद वर्गणी हिशोब पहा ➔
          </button>
        </div>
      )}

      {/* Editable Event Photo Gallery Section */}
      <EventGallerySection
        gallery={gallery}
        onSaveGallery={onSaveGallery}
        currentUser={currentUser}
      />

      {/* WhatsApp Style Full Logo Lightbox Modal */}
      <LogoLightboxModal
        isOpen={isLightboxOpen}
        logoSrc={groupLogo}
        onClose={() => setIsLightboxOpen(false)}
      />

      {/* Member Profile Photo Lightbox Modal */}
      <ProfilePhotoLightboxModal
        isOpen={isMemberPhotoModalOpen}
        onClose={() => setIsMemberPhotoModalOpen(false)}
        photoUrl={memberPhoto}
        memberName={currentUser.name}
        memberRole={currentUser.role}
      />

      {/* Full Screen Receipt/Bill Proof Lightbox Modal */}
      <ProofLightboxModal
        isOpen={Boolean(proofModalUrl)}
        onClose={() => setProofModalUrl(null)}
        imageUrl={proofModalUrl || ''}
      />

      {/* Task Obstacle & Committee Suggestions Modal */}
      {activeObstacleModal && (
        <TaskObstacleModal
          isOpen={Boolean(activeObstacleModal)}
          onClose={() => setActiveObstacleModal(null)}
          task={activeObstacleModal.task}
          occasion={activeObstacleModal.occasion}
          currentUser={currentUser}
          onUpdateTask={(updatedTask) => {
            if (!onUpdateOccasion) return;
            const targetOccasion = activeObstacleModal.occasion;
            let updatedTasks = [...(targetOccasion.tasks || [])];
            if (updatedTask.id.startsWith('occ-main-')) {
              const existingIdx = updatedTasks.findIndex((t) => t.id === updatedTask.id);
              if (existingIdx >= 0) {
                updatedTasks[existingIdx] = updatedTask;
              } else {
                updatedTasks.push(updatedTask);
              }
            } else {
              updatedTasks = updatedTasks.map((t) =>
                t.id === updatedTask.id ? updatedTask : t
              );
            }
            const updatedOccasion = { ...targetOccasion, tasks: updatedTasks };
            onUpdateOccasion(updatedOccasion);
            setActiveObstacleModal({ task: updatedTask, occasion: updatedOccasion });
          }}
        />
      )}
    </div>
  );
};
