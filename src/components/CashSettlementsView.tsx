import React, { useState, useMemo } from 'react';
import {
  Member,
  IncomeTransaction,
  ExpenseTransaction,
  CurrentUser,
  CashSettlement,
  CashSettlementDestination,
  UserDesignation,
  ExpenseCategory,
  RecipientType,
  PaymentMethod,
} from '../types';
import { isDateInSelectedYear, getFinancialYearFromDate, generateNextExpenseTransactionNo, generateNextCashSettlementNo } from '../utils/dateUtils';
import { ProofLightboxModal } from './ProofLightboxModal';
import { uploadFileToGoogleDrive } from '../services/googleDriveService';
import {
  Wallet,
  Landmark,
  ArrowDownCircle,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Clock,
  X,
  Search,
  Calendar,
  ArrowLeft,
  Info,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  UserCheck,
  ShieldCheck,
  Check,
  Building2,
  FileText,
  Receipt,
  Upload,
} from 'lucide-react';

interface CashSettlementsViewProps {
  incomes: IncomeTransaction[];
  expenses?: ExpenseTransaction[];
  cashSettlements: CashSettlement[];
  members: Member[];
  currentUser: CurrentUser;
  selectedYear?: string;
  setSelectedYear?: (year: string) => void;
  onAddCashSettlement: (newSettlement: CashSettlement) => void;
  onApproveCashSettlement: (
    settlementId: string,
    approverName: string,
    approverRole: UserDesignation
  ) => void;
  onRejectCashSettlement: (
    settlementId: string,
    rejecterName: string,
    rejecterRole: UserDesignation
  ) => void;
  onDeleteCashSettlement?: (settlementId: string) => void;
  onAddExpense?: (expense: ExpenseTransaction) => void;
  onApproveExpense?: (expenseId: string, approverName: string, approverRole: any) => void;
  onNavigate?: (tab: string) => void;
  onOpenLogin?: (memberId?: string, type?: 'admin' | 'member') => void;
}

export const CashSettlementsView: React.FC<CashSettlementsViewProps> = ({
  incomes,
  expenses = [],
  cashSettlements,
  members,
  currentUser,
  selectedYear = '२०२६',
  setSelectedYear,
  onAddCashSettlement,
  onApproveCashSettlement,
  onRejectCashSettlement,
  onDeleteCashSettlement,
  onAddExpense,
  onApproveExpense,
  onNavigate,
  onOpenLogin,
}) => {
  const isLoggedIn = currentUser.isLoggedIn !== false;

  // Local filter states
  const [localYear, setLocalYear] = useState<string>(selectedYear || '२०२६');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'debits' | 'history'>('summary');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'मंजूर' | 'प्रलंबित' | 'रद्द'>('ALL');

  // Bank Deposit Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [settleMemberId, setSettleMemberId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDestination, setSettleDestination] =
    useState<CashSettlementDestination>('ट्रस्ट बँक खाते');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [settleBankRefNo, setSettleBankRefNo] = useState('');
  const [settleSlipPhotoUrl, setSettleSlipPhotoUrl] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settleSuccessMsg, setSettleSuccessMsg] = useState<string | null>(null);
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  // Direct Cash Debit (Expense Voucher) Modal states
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [debitMemberId, setDebitMemberId] = useState('');
  const [debitAmount, setDebitAmount] = useState('');
  const [debitDate, setDebitDate] = useState(new Date().toISOString().split('T')[0]);
  const [debitRecipientName, setDebitRecipientName] = useState('');
  const [debitCategory, setDebitCategory] = useState<ExpenseCategory>('पूजा साहित्य व धार्मिक');
  const [debitReason, setDebitReason] = useState('');
  const [debitBillNo, setDebitBillNo] = useState('');
  const [debitAttachmentUrl, setDebitAttachmentUrl] = useState('');
  const [debitNotes, setDebitNotes] = useState('');
  const [isUploadingDebitProof, setIsUploadingDebitProof] = useState(false);
  const [debitError, setDebitError] = useState<string | null>(null);
  const [debitSuccessMsg, setDebitSuccessMsg] = useState<string | null>(null);

  // Treasurer / Vice-Treasurer role permission check
  const loggedMember = members.find(
    (m) =>
      m.fullName.trim().toLowerCase() === (currentUser?.name || '').trim().toLowerCase() ||
      (m.phone && currentUser?.phone && m.phone === currentUser.phone) ||
      (m.email && currentUser?.email && m.email.toLowerCase() === currentUser.email.toLowerCase())
  );

  const effectiveRole = loggedMember?.designation || currentUser.role;

  const isTreasurerOrVice =
    effectiveRole === 'खजिनदार' ||
    effectiveRole === 'उपखजिनदार' ||
    effectiveRole === 'Treasurer' ||
    effectiveRole === 'Vice Treasurer' ||
    effectiveRole === 'ॲडमिन' ||
    effectiveRole === 'Admin' ||
    currentUser.role === 'खजिनदार' ||
    currentUser.role === 'उपखजिनदार' ||
    currentUser.role === 'Treasurer' ||
    currentUser.role === 'Vice Treasurer' ||
    currentUser.role === 'ॲडमिन' ||
    currentUser.role === 'Admin' ||
    (currentUser.name && (
      currentUser.name.includes('उदय') ||
      currentUser.name.includes('हेरवाडे') ||
      currentUser.name.includes('संकेत') ||
      currentUser.name.includes('कौले')
    ));

  // Filter incomes and expenses by selected year
  const activeYear = setSelectedYear ? selectedYear : localYear;
  const filteredIncomesByYear = useMemo(() => {
    if (activeYear === 'ALL') return incomes;
    return incomes.filter((i) =>
      isDateInSelectedYear(i.transactionDate, activeYear, i.financialYear)
    );
  }, [incomes, activeYear]);

  const filteredExpensesByYear = useMemo(() => {
    if (activeYear === 'ALL') return expenses;
    return expenses.filter((e) =>
      isDateInSelectedYear(e.expenseDate, activeYear, e.financialYear)
    );
  }, [expenses, activeYear]);

  // Compute Member Cash Statistics
  const memberCashStats = useMemo(() => {
    const settlementsList = cashSettlements || [];
    const yearSettlements =
      activeYear === 'ALL'
        ? settlementsList
        : settlementsList.filter((s) =>
            isDateInSelectedYear(s.depositDate, activeYear, s.financialYear)
          );

    let totalCashReceivedAll = 0;
    let totalCashSettledAll = 0;
    let totalCashDebitedAll = 0;
    let totalNetCashAll = 0;

    const memberMap: Record<
      string,
      {
        member: Member;
        cashReceived: number;
        cashSettled: number;
        cashDebited: number;
        netCashInHand: number;
        pendingSettlement: number;
        pendingCount: number;
      }
    > = {};

    members.forEach((m) => {
      // 1. Cash Inflows: cash receipts accepted by this member
      const received = filteredIncomesByYear
        .filter(
          (i) =>
            i.paymentMethod === 'रोख' &&
            (i.cashReceiverMemberId === m.id ||
              (i.cashReceiverName && i.cashReceiverName.trim().toLowerCase() === m.fullName.trim().toLowerCase()))
        )
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

      // 2. Cash Outflows - Bank/Trust Handover Settlements (Approved)
      const approvedSettled = yearSettlements
        .filter((s) => s.memberId === m.id && s.approvalStatus === 'मंजूर')
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

      // 3. Cash Outflows - Direct Expense Debits made from cash in hand (Approved or Recorded)
      const approvedDebited = filteredExpensesByYear
        .filter(
          (e) =>
            e.paymentMethod === 'रोख' &&
            e.approvalStatus !== 'रद्द' &&
            (e.paidByMemberId === m.id ||
              (e.paidByMemberName && e.paidByMemberName.trim().toLowerCase() === m.fullName.trim().toLowerCase()))
        )
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const pendingSettled = settlementsList
        .filter((s) => s.memberId === m.id && s.approvalStatus === 'प्रलंबित')
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

      const pendingCount = settlementsList.filter(
        (s) => s.memberId === m.id && s.approvalStatus === 'प्रलंबित'
      ).length;

      const netInHand = Math.max(0, received - approvedSettled - approvedDebited);

      memberMap[m.id] = {
        member: m,
        cashReceived: received,
        cashSettled: approvedSettled,
        cashDebited: approvedDebited,
        netCashInHand: netInHand,
        pendingSettlement: pendingSettled,
        pendingCount,
      };

      totalCashReceivedAll += received;
      totalCashSettledAll += approvedSettled;
      totalCashDebitedAll += approvedDebited;
      totalNetCashAll += netInHand;
    });

    // All pending approvals must always be visible regardless of year filter
    const pendingApprovalsList = settlementsList.filter((s) => s.approvalStatus === 'प्रलंबित');

    const activeCashMembers = Object.values(memberMap)
      .filter((item) => {
        if (!searchQuery.trim()) {
          return item.cashReceived > 0 || item.cashSettled > 0 || item.cashDebited > 0 || item.netCashInHand > 0 || item.pendingCount > 0;
        }
        const q = searchQuery.toLowerCase();
        return (
          item.member.fullName.toLowerCase().includes(q) ||
          item.member.memberCode.toLowerCase().includes(q) ||
          (item.member.designation && item.member.designation.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.netCashInHand - a.netCashInHand);

    return {
      memberMap,
      activeCashMembers,
      totalCashReceivedAll,
      totalCashSettledAll,
      totalCashDebitedAll,
      totalNetCashAll,
      pendingApprovalsList,
    };
  }, [members, filteredIncomesByYear, filteredExpensesByYear, cashSettlements, activeYear, searchQuery]);

  // Open Deposit Modal
  const handleOpenAddSettlement = (memberId?: string) => {
    setSettleError(null);
    setSettleSuccessMsg(null);
    const selfMember = members.find(
      (m) => m.fullName.trim().toLowerCase() === (currentUser?.name || '').trim().toLowerCase()
    );
    const targetId =
      memberId ||
      (selfMember?.id ||
        (memberCashStats.activeCashMembers[0]?.member.id || members[0]?.id || ''));
    setSettleMemberId(targetId);
    const stats = memberCashStats.memberMap[targetId];
    if (stats && stats.netCashInHand > 0) {
      setSettleAmount(String(stats.netCashInHand));
    } else {
      setSettleAmount('');
    }
    setSettleDestination('ट्रस्ट बँक खाते');
    setSettleDate(new Date().toISOString().split('T')[0]);
    setSettleBankRefNo('');
    setSettleSlipPhotoUrl('');
    setSettleNotes('');
    setShowAddModal(true);
  };

  // Open Direct Cash Debit Modal
  const handleOpenAddDebit = (memberId?: string) => {
    setDebitError(null);
    setDebitSuccessMsg(null);
    const selfMember = members.find(
      (m) => m.fullName.trim().toLowerCase() === (currentUser?.name || '').trim().toLowerCase()
    );
    const targetId =
      memberId ||
      (selfMember?.id ||
        (memberCashStats.activeCashMembers[0]?.member.id || members[0]?.id || ''));
    setDebitMemberId(targetId);
    setDebitAmount('');
    setDebitDate(new Date().toISOString().split('T')[0]);
    setDebitRecipientName('');
    setDebitCategory('पूजा साहित्य व धार्मिक');
    setDebitReason('');
    setDebitBillNo('');
    setDebitAttachmentUrl('');
    setDebitNotes('');
    setShowDebitModal(true);
  };

  // Submit Bank Deposit Form
  const handleSettlementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSettleError(null);
    const numAmount = parseFloat(settleAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setSettleError('कृपया वैध रक्कम प्रविष्ट करा.');
      return;
    }
    if (!settleMemberId) {
      setSettleError('कृपया भरणा करणारा सभासद निवडा.');
      return;
    }
    const mem = members.find((m) => m.id === settleMemberId);
    if (!mem) return;

    const stats = memberCashStats.memberMap[settleMemberId];
    const availableInHand = stats ? stats.netCashInHand : 0;
    if (availableInHand > 0 && numAmount > availableInHand) {
      setSettleError(
        `भरणा रक्कम मर्यादेपेक्षा जास्त आहे! या सभासदाकडे केवळ ₹${availableInHand.toLocaleString('en-IN')} शिल्लक रोख उपलब्ध आहे.`
      );
      return;
    }

    const newSettlement: CashSettlement = {
      id: `cset-${Date.now()}`,
      settlementNo: generateNextCashSettlementNo(settleDate, cashSettlements),
      memberId: mem.id,
      memberName: mem.fullName,
      amount: numAmount,
      depositDate: settleDate,
      destination: settleDestination,
      bankRefNo: settleBankRefNo.trim() || undefined,
      slipPhotoUrl: settleSlipPhotoUrl.trim() || undefined,
      notes: settleNotes.trim() || undefined,
      financialYear: activeYear === 'ALL' ? '2026-2027' : activeYear,
      approvalStatus: 'प्रलंबित',
      createdBy: `${currentUser.name} (${currentUser.role})`,
      createdAt: new Date().toISOString(),
    };

    onAddCashSettlement(newSettlement);
    setSettleSuccessMsg(
      'रोख भरणा नोंद सबमिट झाली! खजिनदार किंवा उपखजिनदार (उदा. उदय हेरवाडे) यांच्या मंजुरीनंतर ही रक्कम शिल्लक रोखीतून वजा होईल.'
    );
    setTimeout(() => {
      setShowAddModal(false);
      setSettleSuccessMsg(null);
    }, 1800);
  };

  // Submit Direct Cash Debit Form
  const handleDebitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebitError(null);
    const numAmount = parseFloat(debitAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setDebitError('कृपया वैध खर्चाची रक्कम प्रविष्ट करा.');
      return;
    }
    if (!debitMemberId) {
      setDebitError('कृपया संकलनातून खर्च करणारा सभासद निवडा.');
      return;
    }
    if (!debitRecipientName.trim()) {
      setDebitError('कृपया रक्कम कोणाला दिली / दुकान किंवा व्यक्तीचे नाव प्रविष्ट करा.');
      return;
    }
    const mem = members.find((m) => m.id === debitMemberId);
    if (!mem) return;

    const stats = memberCashStats.memberMap[debitMemberId];
    const availableInHand = stats ? stats.netCashInHand : 0;
    if (availableInHand > 0 && numAmount > availableInHand) {
      setDebitError(
        `खर्च रक्कम मर्यादेपेक्षा जास्त आहे! या सभासदाकडे केवळ ₹${availableInHand.toLocaleString('en-IN')} शिल्लक रोख उपलब्ध आहे.`
      );
      return;
    }

    const isTreasurer = isTreasurerOrVice;
    const transactionNo = generateNextExpenseTransactionNo(debitDate, expenses);

    const newExpense: ExpenseTransaction = {
      id: `exp-${Date.now()}`,
      transactionNo,
      amount: numAmount,
      expenseDate: debitDate,
      recipientType: 'दुकान / Vendor',
      recipientName: debitRecipientName.trim(),
      expenseCategory: debitCategory,
      reason: debitReason.trim() || `${debitCategory} (रोखीतून थेट खर्च)`,
      description: `संकलित रोखीतून थेट खर्च - अदाकर्ता: ${mem.fullName}`,
      paymentMethod: 'रोख',
      paidByMemberId: mem.id,
      paidByMemberName: mem.fullName,
      isPaidFromCashInHand: true,
      billNumber: debitBillNo.trim() || undefined,
      attachmentUrl: debitAttachmentUrl.trim() || undefined,
      notes: debitNotes.trim() || undefined,
      financialYear: getFinancialYearFromDate(debitDate),
      approvalStatus: isTreasurer ? 'मंजूर' : 'प्रलंबित',
      approvedBy: isTreasurer ? `${currentUser.name} (${currentUser.role})` : undefined,
      approvedByRole: isTreasurer ? currentUser.role : undefined,
      approvedAt: isTreasurer ? new Date().toISOString() : undefined,
      createdBy: `${currentUser.name} (${currentUser.role})`,
      createdAt: new Date().toISOString(),
    };

    if (onAddExpense) {
      onAddExpense(newExpense);
    }
    setDebitSuccessMsg(
      'रोखीतून केलेला खर्च / व्हाऊचर नोंद यशस्वीरीत्या सेव्ह झाली! हे ऑडिट अहवालात खर्च म्हणून नोंदले गेले आहे आणि शिल्लक रोखीतून वजा झाले आहे.'
    );
    setTimeout(() => {
      setShowDebitModal(false);
      setDebitSuccessMsg(null);
    }, 1800);
  };

  // Handle Bank Slip file upload
  const handleSlipFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSlip(true);
    try {
      const driveUrl = await uploadFileToGoogleDrive(file, `bank-slip-${file.name}`);
      setSettleSlipPhotoUrl(driveUrl);
    } catch (err) {
      console.warn('Slip upload error:', err);
    } finally {
      setIsUploadingSlip(false);
    }
  };

  // Handle Debit Bill file upload
  const handleDebitBillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingDebitProof(true);
    try {
      const driveUrl = await uploadFileToGoogleDrive(file, `debit-bill-${file.name}`);
      setDebitAttachmentUrl(driveUrl);
    } catch (err) {
      console.warn('Debit bill upload error:', err);
    } finally {
      setIsUploadingDebitProof(false);
    }
  };

  // Filtered Direct Cash Debits List
  const directCashDebitsList = useMemo(() => {
    return filteredExpensesByYear.filter(
      (e) => e.paymentMethod === 'रोख' && (e.isPaidFromCashInHand || Boolean(e.paidByMemberId))
    );
  }, [filteredExpensesByYear]);

  // Filtered History Settlements
  const filteredHistory = useMemo(() => {
    let list = cashSettlements || [];
    if (historyFilter !== 'ALL') {
      list = list.filter((s) => s.approvalStatus === historyFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.memberName.toLowerCase().includes(q) ||
          (s.bankRefNo && s.bankRefNo.toLowerCase().includes(q)) ||
          (s.notes && s.notes.toLowerCase().includes(q))
      );
    }
    return list;
  }, [cashSettlements, historyFilter, searchQuery]);

  return (
    <div className="space-y-6 my-4">
      {/* Top Banner & Control Bar */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border border-slate-700 font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1"
              title="मुख्य डॅशबोर्डवर परत जा"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">← मुख्य पान</span>
            </button>
          )}
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-2xl flex items-center justify-center font-bold shrink-0">
            <Wallet className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                रोख संकलन, भरणा व ऑडिट डेबिट हिशोब
              </h2>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-md text-xs font-black">
                Trust Cash Audit System
              </span>
              {memberCashStats.pendingApprovalsList.length > 0 && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-md text-[11px] font-black animate-pulse flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {memberCashStats.pendingApprovalsList.length} प्रलंबित मंजुऱ्या
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              सभासदांनी जमा केलेली रोख रक्कम, बँकेत भरणा आणि संकलनातून थेट केलेला अधिकृत खर्च (ऑडिट व्हाउचर).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap justify-end">
          {/* Year selector */}
          <div className="flex items-center gap-1.5 bg-emerald-50/90 dark:bg-slate-700/60 border border-emerald-300 dark:border-emerald-700 p-1.5 px-3 rounded-xl shrink-0">
            <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300 hidden sm:inline">
              वर्ष:
            </span>
            <select
              value={activeYear}
              onChange={(e) => {
                const val = e.target.value;
                if (setSelectedYear) setSelectedYear(val);
                setLocalYear(val);
              }}
              className="bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600 font-black text-emerald-950 dark:text-emerald-300 text-xs rounded-lg px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              <option value="२०२६">२०२६ (१ जाने - ३१ डिसे)</option>
              <option value="२०२५">२०२५ (१ जाने - ३१ डिसे)</option>
              <option value="२०२४">२०२४ (१ जाने - ३१ डिसे)</option>
              <option value="२०२७">२०२७ (१ जाने - ३१ डिसे)</option>
              <option value="२०२६-२७">२०२६-२७ (आर्थिक वर्ष)</option>
              <option value="२०२५-२६">२०२५-२६ (आर्थिक वर्ष)</option>
              <option value="ALL">सर्व वर्षे (All Years)</option>
            </select>
          </div>

          {/* Action 1: Bank Deposit */}
          <button
            type="button"
            onClick={() => handleOpenAddSettlement()}
            className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all shrink-0 active:scale-95"
          >
            <Landmark className="w-4 h-4" />
            <span>➕ बँक भरणा नोंद</span>
          </button>

          {/* Action 2: Direct Cash Expense Debit */}
          <button
            type="button"
            onClick={() => handleOpenAddDebit()}
            className="px-3.5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all shrink-0 active:scale-95"
          >
            <Receipt className="w-4 h-4" />
            <span>➕ रोखीतून खर्च (Audit Debit)</span>
          </button>
        </div>
      </div>

      {/* ─── 4 Summary KPI Cards for Audit ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-2xl flex items-center justify-center shrink-0">
            <ArrowDownCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              १. एकूण रोख संकलन (Received)
            </p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              ₹{memberCashStats.totalCashReceivedAll.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-2xl flex items-center justify-center shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              २. बँकेत/ट्रस्टकडे जमा (Settled)
            </p>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
              ₹{memberCashStats.totalCashSettledAll.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-rose-200 dark:border-rose-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 rounded-2xl flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              ३. रोखीतून खर्च (Direct Debits)
            </p>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              ₹{memberCashStats.totalCashDebitedAll.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-300 dark:border-emerald-600 shadow-sm flex items-center gap-4 ring-2 ring-emerald-500/20">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-2xl flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              ४. निव्वळ शिल्लक रोख (Net in Hand)
            </p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              ₹{memberCashStats.totalNetCashAll.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Pending Approvals Queue (Treasurer & Vice Treasurer) ─── */}
      {memberCashStats.pendingApprovalsList.length > 0 && (
        <div className="bg-amber-950/80 border-2 border-amber-500/60 text-white rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-amber-500/30 pb-3">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-400 animate-spin" />
              <h3 className="text-base font-black text-amber-300">
                ⏳ प्रलंबित रोख भरणा मंजुरी विनंत्या ({memberCashStats.pendingApprovalsList.length})
              </h3>
            </div>
            {isTreasurerOrVice ? (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                आपण खजिनदार / उपखजिनदार म्हणून मंजुरी देऊ शकता
              </span>
            ) : (
              <span className="text-xs text-amber-200/80">
                (केवळ खजिनदार व उपखजिनदार यांच्या मंजुरीसाठी)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {memberCashStats.pendingApprovalsList.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/95 border border-amber-500/40 p-4 rounded-2xl flex flex-col justify-between gap-3 shadow-lg"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-sm">{item.memberName}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                        {item.depositDate}
                      </span>
                    </div>
                    <p className="text-base text-emerald-400 font-black mt-1">
                      भरणा रक्कम: ₹{item.amount.toLocaleString('en-IN')}/-
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      गंतव्य: <strong>{item.destination}</strong>
                      {item.bankRefNo && ` | संदर्भ: ${item.bankRefNo}`}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-slate-400 italic mt-1 bg-slate-800/50 p-1.5 rounded-lg border border-slate-700/50">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  {item.slipPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewProofUrl(item.slipPhotoUrl || null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 border border-slate-700 cursor-pointer shadow transition-all"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>स्लिप फोटो</span>
                    </button>
                  )}
                </div>

                {isTreasurerOrVice ? (
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        onApproveCashSettlement(item.id, currentUser.name, currentUser.role)
                      }
                      className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>मंजूर करा (Deduct Cash)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onRejectCashSettlement(item.id, currentUser.name, currentUser.role)
                      }
                      className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>रद्द</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-amber-300/80 italic pt-2 border-t border-slate-800 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    मंजुरीसाठी खजिनदार / उपखजिनदार यांच्याकडे प्रलंबित आहे.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Navigation Tabs ─── */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`py-3 px-5 text-xs font-black flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'summary'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>सभासदनिहाय शिल्लक रोख हिशोब ({memberCashStats.activeCashMembers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('debits')}
          className={`py-3 px-5 text-xs font-black flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'debits'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>रोखीतून केलेल्या खर्चाच्या नोंदी / Audit Debits ({directCashDebitsList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`py-3 px-5 text-xs font-black flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>गेल्या बँक भरणा नोंदींचा हिशोब इतिहास ({cashSettlements.length})</span>
        </button>
      </div>

      {/* ─── TAB 1: Member-wise Cash Status Cards ─── */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {memberCashStats.activeCashMembers.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Wallet className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                सध्या कोणत्याही सभासदाकडे रोख शिल्लक नाही
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                जेव्हा कोणी सभासद रोख स्वरूपात वर्गणी किंवा देणगी स्वीकारेल, तेव्हा त्यांची नोंद व शिल्लक हिशोब येथे दिसेल.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {memberCashStats.activeCashMembers.map((item) => (
                <div
                  key={item.member.id}
                  className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all ${
                    item.netCashInHand > 0
                      ? 'border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full border-2 border-emerald-400 p-0.5 bg-slate-900 flex items-center justify-center text-amber-300 font-bold text-xs shrink-0">
                          {item.member.photoUrl ? (
                            <img
                              src={item.member.photoUrl}
                              alt={item.member.fullName}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            item.member.fullName.slice(0, 2)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono font-bold text-[10px] rounded border border-slate-200 dark:border-slate-600">
                              {item.member.memberCode}
                            </span>
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 font-bold text-[10px] rounded">
                              {item.member.designation || 'सभासद'}
                            </span>
                          </div>
                          <h4 className="text-base font-black text-slate-800 dark:text-slate-100 mt-1">
                            {item.member.fullName}
                          </h4>
                          <p className="text-[11px] text-slate-400">मो: {item.member.phone}</p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 text-[11px] font-black rounded-full shrink-0 ${
                          item.netCashInHand > 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.netCashInHand > 0 ? 'शिल्लक रोख' : 'हिशोब पूर्ण'}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">एकूण स्वीकारलेली रोख:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          ₹{item.cashReceived.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">बँकेत/ट्रस्टकडे जमा (भरणा):</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          - ₹{item.cashSettled.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">रोखीतून केलेला खर्च (Audit Debit):</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          - ₹{item.cashDebited.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-black">
                        <span className="text-emerald-800 dark:text-emerald-300">शिल्लक रोख रक्कम:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          ₹{item.netCashInHand.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {item.pendingSettlement > 0 && (
                        <p className="text-[10px] text-amber-500 font-bold text-right pt-0.5">
                          (₹{item.pendingSettlement.toLocaleString('en-IN')} भरणा मंजुरी प्रलंबित)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAddSettlement(item.member.id)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      <span>बँक भरणा</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAddDebit(item.member.id)}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>रोखीतून खर्च</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: Direct Cash Debits / Expense Vouchers List ─── */}
      {activeTab === 'debits' && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                संकलित रोखीतून केलेले थेट खर्च (Trust Audit Expense Vouchers)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                सभासदांनी रोखीतून ट्रस्टच्या कामांसाठी थेट दिलेली बिले व व्हाऊचर्स.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAddDebit()}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Receipt className="w-4 h-4" />
              <span>➕ नवीन रोख खर्च नोंद</span>
            </button>
          </div>

          {directCashDebitsList.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-8">
              सध्या संकलित रोखीतून थेट केलेल्या खर्चाची कोणतीही नोंद नाही.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">दिनांक</th>
                    <th className="p-3">खर्च करणारा सभासद</th>
                    <th className="p-3">प्राप्तकर्ता / Vendor</th>
                    <th className="p-3">खर्च प्रकार / कारण</th>
                    <th className="p-3">रक्कम</th>
                    <th className="p-3">बिल क्र.</th>
                    <th className="p-3">दर्जा</th>
                    <th className="p-3">बिल पुरावा</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {directCashDebitsList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                      <td className="p-3 font-bold">{item.expenseDate}</td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-100">
                        {item.paidByMemberName || 'सभासद'}
                      </td>
                      <td className="p-3 font-medium">{item.recipientName}</td>
                      <td className="p-3">
                        <span className="font-bold">{item.expenseCategory}</span>
                        {item.reason && <p className="text-[10px] text-slate-400 italic">{item.reason}</p>}
                      </td>
                      <td className="p-3 font-black text-rose-600 dark:text-rose-400">
                        ₹{item.amount.toLocaleString('en-IN')}/-
                      </td>
                      <td className="p-3 font-mono text-slate-500">{item.billNumber || '---'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.approvalStatus === 'मंजूर'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {item.approvalStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        {item.attachmentUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewProofUrl(item.attachmentUrl || null)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <ImageIcon className="w-3 h-3 text-rose-600" />
                            <span>बिल पहा</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">---</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: Complete Bank Deposit History Log ─── */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex gap-2 flex-wrap">
              {(['ALL', 'मंजूर', 'प्रलंबित', 'रद्द'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setHistoryFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    historyFilter === status
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {status === 'ALL' ? 'सर्व नोंदी' : status}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-500 font-bold">
              एकूण {filteredHistory.length} नोंदी
            </span>
          </div>

          {filteredHistory.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-8">
              कोणतीही भरणा नोंद सापडली नाही.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">दिनांक</th>
                    <th className="p-3">सभासद नाव</th>
                    <th className="p-3">भरणा रक्कम</th>
                    <th className="p-3">गंतव्य (Destination)</th>
                    <th className="p-3">बँक संदर्भ / स्लिप क्र.</th>
                    <th className="p-3">मंजुरी दर्जा</th>
                    <th className="p-3">पुरावा</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                      <td className="p-3 font-bold">{item.depositDate}</td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {item.memberName}
                        </span>
                        {item.notes && <p className="text-[10px] text-slate-400 italic">"{item.notes}"</p>}
                      </td>
                      <td className="p-3 font-black text-emerald-600 dark:text-emerald-400">
                        ₹{item.amount.toLocaleString('en-IN')}/-
                      </td>
                      <td className="p-3 font-medium">{item.destination}</td>
                      <td className="p-3 font-mono text-slate-500">{item.bankRefNo || '---'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.approvalStatus === 'मंजूर'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : item.approvalStatus === 'रद्द'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {item.approvalStatus}
                          {item.approvedBy && ` (${item.approvedBy})`}
                        </span>
                      </td>
                      <td className="p-3">
                        {item.slipPhotoUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewProofUrl(item.slipPhotoUrl || null)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <ImageIcon className="w-3 h-3 text-emerald-600" />
                            <span>फोटो</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">---</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Modal 1: Add Cash Settlement (Bank Deposit) ─── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                    ट्रस्टकडे / बँकेत रोख भरणा नोंद
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    रोख संकलन जमाव ट्रस्ट बँक खात्यात किंवा खजिनदाराकडे सुपूर्द करा
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg font-bold text-sm cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettlementSubmit} className="space-y-4 text-xs">
              {/* Member Selection */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  भरणा करणारा सभासद निवडा <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={settleMemberId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSettleMemberId(id);
                    const stats = memberCashStats.memberMap[id];
                    if (stats && stats.netCashInHand > 0) {
                      setSettleAmount(String(stats.netCashInHand));
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                >
                  <option value="">-- सभासद निवडा --</option>
                  {members.map((m) => {
                    const stats = memberCashStats.memberMap[m.id];
                    const inHand = stats?.netCashInHand || 0;
                    return (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.designation || 'सभासद'}) {inHand > 0 ? `— शिल्लक रोख: ₹${inHand.toLocaleString('en-IN')}` : ''}
                      </option>
                    );
                  })}
                </select>
                {settleMemberId && memberCashStats.memberMap[settleMemberId] && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    💵 या सभासदाकडील सध्याची शिल्लक रोख रक्कम: ₹
                    {memberCashStats.memberMap[settleMemberId].netCashInHand.toLocaleString('en-IN')}
                  </p>
                )}
              </div>

              {/* Amount & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      भरणा रक्कम (₹) <span className="text-rose-500">*</span>:
                    </label>
                    {settleMemberId && memberCashStats.memberMap[settleMemberId]?.netCashInHand > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const maxInHand = memberCashStats.memberMap[settleMemberId].netCashInHand;
                          setSettleAmount(String(maxInHand));
                          setSettleError(null);
                        }}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                      >
                        ⚡ संपूर्ण शिल्लक (₹{memberCashStats.memberMap[settleMemberId].netCashInHand.toLocaleString('en-IN')})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    value={settleAmount}
                    onChange={(e) => {
                      setSettleAmount(e.target.value);
                      const maxVal = memberCashStats.memberMap[settleMemberId]?.netCashInHand || 0;
                      if (parseFloat(e.target.value) > maxVal) {
                        setSettleError(`कमाल शिल्लक मर्यादा: ₹${maxVal.toLocaleString('en-IN')}`);
                      } else {
                        setSettleError(null);
                      }
                    }}
                    max={
                      memberCashStats.memberMap[settleMemberId]?.netCashInHand &&
                      memberCashStats.memberMap[settleMemberId].netCashInHand > 0
                        ? memberCashStats.memberMap[settleMemberId].netCashInHand
                        : undefined
                    }
                    placeholder={
                      settleMemberId && (memberCashStats.memberMap[settleMemberId]?.netCashInHand || 0) > 0
                        ? `कमाल ₹${(memberCashStats.memberMap[settleMemberId]?.netCashInHand || 0).toLocaleString('en-IN')}`
                        : 'उदा. ५०००'
                    }
                    min="1"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl font-black text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    भरणा पद्धत / गंतव्य <span className="text-rose-500">*</span>:
                  </label>
                  <select
                    value={settleDestination}
                    onChange={(e) => setSettleDestination(e.target.value as CashSettlementDestination)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="ट्रस्ट बँक खाते">🏦 ट्रस्ट बँक खाते भरणा (Bank Deposit)</option>
                    <option value="खजिनदार / उपखजिनदार">🤝 खजिनदार / उपखजिनदाराकडे थेट रोख सुपूर्द (Handover)</option>
                  </select>
                </div>
              </div>

              {/* Deposit Date & Bank Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    भरणा दिनांक (Date) <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="date"
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    बँक संदर्भ / स्लिप क्र. (Ref / Slip No):
                  </label>
                  <input
                    type="text"
                    value={settleBankRefNo}
                    onChange={(e) => setSettleBankRefNo(e.target.value)}
                    placeholder="उदा. UTR / Chq / Slip 45892"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Bank Deposit Slip Photo Upload */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>📷 बँक पावती / स्लिप फोटो (Proof Slip):</span>
                  {isUploadingSlip && <span className="text-[10px] text-amber-500 font-bold animate-pulse">अपलोड होत आहे...</span>}
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSlipFileUpload}
                    className="flex-1 text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                  {settleSlipPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewProofUrl(settleSlipPhotoUrl)}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>फोटो पहा</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  नोंद / शेरा (Notes):
                </label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="उदा. गणेशोत्सव संकलित रोख रक्कम बँक खात्यात जमा"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-300 text-[11px] leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>महत्त्वाची नोंद:</strong> ही भरणा नोंद सबमिट झाल्यानंतर खजिनदार (Treasurer) किंवा उपखजिनदार (Vice Treasurer) यांच्या अधिकृत मंजुरीनंतरच संबंधित सभासदाच्या शिल्लक रोख रकमेतून वजा (Minus) केली जाईल.
                </span>
              </div>

              {settleError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{settleError}</span>
                </div>
              )}

              {settleSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{settleSuccessMsg}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>रोख भरणा सबमिट करा</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Add Direct Cash Debit (Expense Voucher for Audit) ─── */}
      {showDebitModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                    रोखीतून थेट खर्च नोंद (Audit Debit Voucher)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    संकलित रोखीतून ट्रस्टच्या कामांसाठी थेट केलेला खर्च व बिल नोंद
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDebitModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg font-bold text-sm cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDebitSubmit} className="space-y-4 text-xs">
              {/* Member Selection */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  कोणाच्या संकलित रोखीतून (Cash in Hand) खर्च केला? <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={debitMemberId}
                  onChange={(e) => setDebitMemberId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none"
                  required
                >
                  <option value="">-- सभासद निवडा --</option>
                  {members.map((m) => {
                    const stats = memberCashStats.memberMap[m.id];
                    const inHand = stats?.netCashInHand || 0;
                    return (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.designation || 'सभासद'}) {inHand > 0 ? `— शिल्लक रोख: ₹${inHand.toLocaleString('en-IN')}` : ''}
                      </option>
                    );
                  })}
                </select>
                {debitMemberId && memberCashStats.memberMap[debitMemberId] && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    💵 या सभासदाकडील सध्याची शिल्लक रोख रक्कम: ₹
                    {memberCashStats.memberMap[debitMemberId].netCashInHand.toLocaleString('en-IN')}
                  </p>
                )}
              </div>

              {/* Amount & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      खर्च रक्कम (₹) <span className="text-rose-500">*</span>:
                    </label>
                    {debitMemberId && memberCashStats.memberMap[debitMemberId]?.netCashInHand > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const maxInHand = memberCashStats.memberMap[debitMemberId].netCashInHand;
                          setDebitAmount(String(maxInHand));
                          setDebitError(null);
                        }}
                        className="text-[10px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                      >
                        ⚡ संपूर्ण शिल्लक (₹{memberCashStats.memberMap[debitMemberId].netCashInHand.toLocaleString('en-IN')})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    value={debitAmount}
                    onChange={(e) => {
                      setDebitAmount(e.target.value);
                      const maxVal = memberCashStats.memberMap[debitMemberId]?.netCashInHand || 0;
                      if (parseFloat(e.target.value) > maxVal) {
                        setDebitError(`कमाल शिल्लक मर्यादा: ₹${maxVal.toLocaleString('en-IN')}`);
                      } else {
                        setDebitError(null);
                      }
                    }}
                    max={
                      memberCashStats.memberMap[debitMemberId]?.netCashInHand &&
                      memberCashStats.memberMap[debitMemberId].netCashInHand > 0
                        ? memberCashStats.memberMap[debitMemberId].netCashInHand
                        : undefined
                    }
                    placeholder={
                      debitMemberId && (memberCashStats.memberMap[debitMemberId]?.netCashInHand || 0) > 0
                        ? `कमाल ₹${(memberCashStats.memberMap[debitMemberId]?.netCashInHand || 0).toLocaleString('en-IN')}`
                        : 'उदा. १५००'
                    }
                    min="1"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl font-black text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    खर्च प्रकार (Category) <span className="text-rose-500">*</span>:
                  </label>
                  <select
                    value={debitCategory}
                    onChange={(e) => setDebitCategory(e.target.value as ExpenseCategory)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    <option value="पूजा साहित्य व धार्मिक">पूजा साहित्य व धार्मिक</option>
                    <option value="मंडप व सजावट">मंडप व सजावट</option>
                    <option value="ध्वनी व प्रकाश (Sound & Light)">ध्वनी व प्रकाश (Sound & Light)</option>
                    <option value="महाप्रसाद व भोजन">महाप्रसाद व भोजन</option>
                    <option value="वाहतूक खर्च">वाहतूक खर्च</option>
                    <option value="जाहिरात व बॅनर">जाहिरात व बॅनर</option>
                    <option value="वीज व पाणी">वीज व पाणी</option>
                    <option value="इतर खर्च">इतर खर्च</option>
                  </select>
                </div>
              </div>

              {/* Recipient Vendor Name & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    कोणाला दिले? (Vendor / व्यक्ती) <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={debitRecipientName}
                    onChange={(e) => setDebitRecipientName(e.target.value)}
                    placeholder="उदा. साई पूजा भांडार / राजू ड्रायव्हर"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    खर्च दिनांक <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="date"
                    value={debitDate}
                    onChange={(e) => setDebitDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Reason & Bill No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    खर्चाचे कारण (Reason):
                  </label>
                  <input
                    type="text"
                    value={debitReason}
                    onChange={(e) => setDebitReason(e.target.value)}
                    placeholder="उदा. नारळ, अगरबत्ती, फुले खरेदी"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    बिल / व्हाऊचर क्र. (Bill / Voucher No):
                  </label>
                  <input
                    type="text"
                    value={debitBillNo}
                    onChange={(e) => setDebitBillNo(e.target.value)}
                    placeholder="उदा. BILL-8493"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              {/* Bill Proof Upload */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>📷 बिल / व्हाऊचर फोटो पुरावा (Bill / Voucher Proof):</span>
                  {isUploadingDebitProof && <span className="text-[10px] text-rose-500 font-bold animate-pulse">अपलोड होत आहे...</span>}
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDebitBillUpload}
                    className="flex-1 text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
                  />
                  {debitAttachmentUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewProofUrl(debitAttachmentUrl)}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-rose-600" />
                      <span>बिल पहा</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-950 dark:text-blue-300 text-[11px] leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>ऑडिट नोंद:</strong> हा खर्च सबमिट केल्यावर ट्रस्टच्या मुख्य खर्च वहीत (Expense Register) अधिकृत खर्च म्हणून नोंदवला जाईल आणि संबंधित सभासदाच्या शिल्लक रोख रकमेतून (Cash in Hand) वजा केला जाईल.
                </span>
              </div>

              {debitError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{debitError}</span>
                </div>
              )}

              {debitSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{debitSuccessMsg}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowDebitModal(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>रोख खर्च सबमिट करा (Audit Voucher)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Lightbox Modal */}
      {previewProofUrl && (
        <ProofLightboxModal
          isOpen={!!previewProofUrl}
          onClose={() => setPreviewProofUrl(null)}
          imageUrl={previewProofUrl}
          title="बिल / पावती फोटो पुरावा"
        />
      )}
    </div>
  );
};
