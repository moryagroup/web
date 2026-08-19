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
} from '../types';
import { HeaderStats } from './HeaderStats';
import { EventGallerySection } from './EventGallerySection';
import { ProfilePhotoLightboxModal } from './ProfilePhotoLightboxModal';
import { ProofLightboxModal } from './ProofLightboxModal';
import { TaskObstacleModal } from './TaskObstacleModal';
import { isGoogleDriveUrl } from '../services/googleDriveService';
import { hasFullFinancialAccess, isBadgedMember, canViewRecentGroupTransactions, canApproveFinancialTransactions } from '../utils/rbac';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle,
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
} from 'lucide-react';

interface DashboardViewProps {
  summary: FinancialYearSummary;
  incomes: IncomeTransaction[];
  expenses: ExpenseTransaction[];
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
  onLogout?: () => void;
  onOpenLogin?: () => void;
  onUpdateOccasion?: (occasion: OccasionEvent) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  incomes,
  expenses,
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

        if (matchesMemberId || matchesPhone || matchesName) {
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
    (currentUser.name && (
      currentUser.name.includes('उदय') ||
      currentUser.name.includes('हेरवाडे') ||
      currentUser.name.includes('संकेत') ||
      currentUser.name.includes('कौले')
    ));

  const displayIncomes = useMemo(() => {
    if (!Array.isArray(incomes)) return [];
    if (canApprove) return incomes;
    const userNorm = (currentUser?.name || '').trim().toLowerCase();
    return incomes.filter(
      (i) =>
        (currentMember && i.linkedMemberId === currentMember.id) ||
        (i.depositorName || '').trim().toLowerCase().includes(userNorm) ||
        (i.createdBy || '').trim().toLowerCase().includes(userNorm)
    );
  }, [incomes, canApprove, currentMember, currentUser]);

  const displayExpenses = useMemo(() => {
    if (!Array.isArray(expenses)) return [];
    if (canApprove) return expenses;
    const userNorm = (currentUser?.name || '').trim().toLowerCase();
    return expenses.filter(
      (e) =>
        (currentMember && e.linkedMemberId === currentMember.id) ||
        (e.recipientName || '').trim().toLowerCase().includes(userNorm) ||
        (e.createdBy || '').trim().toLowerCase().includes(userNorm)
    );
  }, [expenses, canApprove, currentMember, currentUser]);

  const recentIncomes = displayIncomes.slice(0, 5);
  const recentExpenses = displayExpenses.slice(0, 5);

  const pendingIncomes = canApprove
    ? incomes.filter((i) => i.approvalStatus === 'प्रलंबित')
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
        <HeaderStats
          summary={summary}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          currentUser={currentUser}
          onLogout={onLogout}
        />

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
    <div className="space-y-6 my-2">
      {/* Income, Expense & Net Balance Summary Cards */}
      <HeaderStats
        summary={summary}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        currentUser={currentUser}
        onLogout={onLogout}
      />
      {/* Quick Action Cards & Greeting */}
      <div className="bg-gradient-to-r from-amber-950 via-rose-950 to-orange-950 text-white p-6 rounded-3xl shadow-xl border border-amber-500/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          {/* Logged-in Member Profile Photo Badge */}
          {isLoggedIn && (
            <div
              className="relative group cursor-pointer shrink-0"
              onClick={() => setIsMemberPhotoModalOpen(true)}
              title="मोठा प्रोफाईल फोटो पहा (Click for Full Screen View)"
            >
              {memberPhoto ? (
                <img
                  src={memberPhoto}
                  alt={currentUser.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-full border-2 border-amber-400 p-0.5 bg-slate-950 shadow-xl group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-amber-400/90 bg-amber-500/20 flex flex-col items-center justify-center text-amber-300 font-black shadow-xl group-hover:scale-105 transition-transform">
                  <User className="w-7 h-7 text-amber-400" />
                  <span className="text-[8px] font-bold text-amber-200">फोटो जोडा</span>
                </div>
              )}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('profile');
                }}
                className="absolute -bottom-1 -right-1 bg-amber-500 hover:bg-amber-400 text-slate-950 p-1 rounded-full border border-amber-300 shadow-md group-hover:scale-110 transition-transform"
                title="फोटो बदला"
              >
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md text-[11px] font-bold uppercase tracking-wider">
                {currentUser.role} लॉगइन
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black mt-1 text-white flex items-center gap-2">
              नमस्कार, {currentUser.name}! 🙏
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              <strong className="text-amber-300">हडपसर गोंधळनगर</strong> — सर्व उत्पन्न, वर्गणी, प्रायोजकत्व व खर्चाची अधिकृत डिजिटल हिशोब नोंदणी प्रणाली.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          <button
            onClick={() => onNavigate('income-form')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ नवीन जमा नोंद</span>
          </button>
          <button
            onClick={() => onNavigate('expense-form')}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ नवीन खर्च नोंद</span>
          </button>

          {isLoggedIn ? (
            <button
              onClick={onLogout}
              className="px-4 py-2.5 bg-slate-800 hover:bg-rose-700 text-white border border-slate-700 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              title="लॉगआउट करा"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>लॉगआउट</span>
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>लॉगइन</span>
            </button>
          )}
        </div>
      </div>

      {/* Home Page Notification: Assigned Event Tasks & Work Responsibilities */}
      {assignedTasksForMe.length > 0 && (
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-xl border border-purple-500/50 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-purple-500/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                <ListChecks className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-amber-400 flex items-center gap-2">
                  <span>तुमच्याकडे सोपवलेली उत्सव कामांची जबाबदारी</span>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded-full text-[10px]">
                    {assignedTasksForMe.length} कामे
                  </span>
                </h3>
                <p className="text-[11px] text-purple-200">
                  मंडळ व्यवस्थापनाने उत्सवात तुमच्या नावावर खालील प्रमुख कामांची जबाबदारी दिली आहे:
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {assignedTasksForMe.map(({ occasion, task }) => (
              <div
                key={task.id}
                className="bg-slate-900/90 p-3.5 rounded-xl border border-purple-500/40 flex justify-between items-center gap-3 shadow-md"
              >
                <div className="space-y-1">
                  <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 font-bold text-[10px] rounded border border-purple-400/40">
                    {occasion.name} ({occasion.year})
                  </span>
                  <p className="font-black text-amber-300 text-sm">{task.taskTitle}</p>
                  <p className="text-[10px] text-slate-400">
                    प्रमुख व्यवस्थापक: <span className="text-white font-bold">{task.assignedMemberName}</span> ({task.assignedMemberRole || 'सभासद'})
                  </p>
                  {task.status === 'अडचण / समस्या' && (
                    <div className="mt-2 p-2 bg-rose-950/60 border border-rose-600/60 rounded-lg text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-300 font-bold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                        <span>कामात अडचण आल्याने थांबले आहे</span>
                      </div>
                      {task.obstacleDetails && (
                        <p className="text-[11px] text-rose-200 italic">
                          "{task.obstacleDetails}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0 space-y-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                      task.status === 'पूर्ण'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : task.status === 'प्रक्रियेत'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : task.status === 'अडचण / समस्या'
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-500/60 font-black animate-pulse'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {task.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => setActiveObstacleModal({ task, occasion })}
                    className="block w-full px-2.5 py-1 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-[10px] rounded-lg shadow cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>
                      {task.status === 'अडचण / समस्या' ? '⚠️ अडचण / सूचना द्या' : 'कामाचे तपशील / सूचना'}
                      {(task.suggestions?.length || 0) > 0 ? ` (${task.suggestions?.length})` : ''}
                    </span>
                  </button>

                  {onUpdateOccasion && (
                    <button
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
                      className="block w-full px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] rounded-lg border border-slate-700 shadow cursor-pointer transition-all active:scale-95 text-center"
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

      {/* Pending Income Approvals Banner (If any) */}
      {pendingIncomes.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-200/60">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-emerald-600 animate-bounce" />
              <span>जमा (वर्गणी/देणगी) मंजुरी प्रलंबित ({pendingIncomes.length} व्यवहार)</span>
            </div>
            <button
              onClick={() => onNavigate('income-history')}
              className="text-xs text-emerald-800 hover:underline font-bold flex items-center gap-1 cursor-pointer"
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
                    {inc.attachmentUrl ? (
                      <button
                        type="button"
                        onClick={() => handleProofClick(inc.attachmentUrl!)}
                        className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-400 rounded-lg text-[11px] font-bold flex items-center gap-1 hover:bg-emerald-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
                        title="पावती पुरावा पहा (Click to view attachment proof)"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-emerald-700" />
                        <span>📎 जमा पावती पुरावा पाहा</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-amber-800 italic bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300">
                        (कोणताही पुरावा जोडलेला नाही)
                      </span>
                    )}
                  </div>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    तारीख: {inc.transactionDate} {inc.receiptNumber ? `| पावती क्र: ${inc.receiptNumber}` : ''} | नोंद: {inc.createdBy}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-black text-emerald-700 text-sm">
                    + ₹{inc.amount.toLocaleString('en-IN')}
                  </span>
                  {canApprove && onApproveIncome && (
                    <button
                      onClick={() => onApproveIncome(inc.id, currentUser.name, currentUser.role)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      मंजूर करा
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Income / Deposit Approvals Banner (If any) */}
      {pendingIncomes.length > 0 && (
        <div className="bg-emerald-950/90 text-white border-2 border-emerald-500/50 p-4 sm:p-5 rounded-2xl shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
              <Clock className="w-5 h-5 text-emerald-400 animate-spin" />
              <span>जमा / डिपॉझिट मंजुरी प्रलंबित ({pendingIncomes.length} व्यवहार)</span>
            </div>
            <button
              onClick={() => onNavigate('income-history')}
              className="text-xs text-emerald-300 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>सर्व प्रलंबित जमा पहा</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {pendingIncomes.map((inc) => (
              <div
                key={inc.id}
                className="bg-slate-900/90 p-3 rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-white">{inc.depositorName}</span>
                    <span className="text-slate-300">
                      ({inc.incomeType} - {inc.reason})
                    </span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 text-[10px] font-bold">
                      {inc.paymentMethod}
                    </span>
                    {inc.paymentMethod === 'रोख' && inc.cashReceiverName && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40 text-[10px] font-bold">
                        💵 रोख स्वीकारक: {inc.cashReceiverName}
                      </span>
                    )}
                    {inc.attachmentUrl && (
                      <button
                        type="button"
                        onClick={() => handleProofClick(inc.attachmentUrl!)}
                        className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-emerald-500/30 cursor-pointer"
                        title="पावती/पुरावा पहा"
                      >
                        <Paperclip className="w-3 h-3 text-emerald-400" />
                        <span>📎 पावती पुरावा</span>
                      </button>
                    )}
                  </div>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    तारीख: {inc.transactionDate} {inc.paymentReference ? `| संदर्भ: ${inc.paymentReference}` : ''} | नोंद: {inc.createdBy}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-black text-emerald-400 text-sm">
                    + ₹{inc.amount.toLocaleString('en-IN')}
                  </span>
                  {canApprove && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onApproveIncome && onApproveIncome(inc.id, currentUser.name, currentUser.role)}
                        className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>मंजूर करा</span>
                      </button>
                      <button
                        onClick={() => onRejectIncome && onRejectIncome(inc.id, currentUser.name, currentUser.role)}
                        className="px-2.5 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
                      >
                        रद्द
                      </button>
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
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>मंजूर करा</span>
                      </button>
                      {onRejectExpense && (
                        <button
                          onClick={() => onRejectExpense(exp.id, currentUser.name, currentUser.role)}
                          className="px-2.5 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
                        >
                          रद्द
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
