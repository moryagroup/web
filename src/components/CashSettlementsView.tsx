import React, { useState, useMemo, useEffect } from 'react';
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
import { isDateInSelectedYear, isDateBeforeSelectedYear, getFinancialYearFromDate, generateNextExpenseTransactionNo, generateNextCashSettlementNo } from '../utils/dateUtils';
import { isCommitteeMember, isBadgedMember } from '../utils/rbac';
import { RbacGuard } from './RbacGuard';
import { ProofLightboxModal } from './ProofLightboxModal';
import { uploadFileToGoogleDrive } from '../services/googleDriveService';
import { fetchCloudDatabase } from '../services/cloudDatabaseService';
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
  ReceiptIndianRupee,
  Upload,
  Trash2,
  RefreshCw,
  BookOpen,
  Share2,
  Printer,
  ChevronRight,
  Eye,
  Filter,
  ArrowUpCircle,
  Download,
  ArrowUpDown,
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
  // Local filter states
  const [localYear, setLocalYear] = useState<string>(selectedYear || '२०२६');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'debits' | 'history'>(() => {
    try {
      const saved = sessionStorage.getItem('morya_cash_settlement_subtab');
      if (saved === 'summary' || saved === 'debits' || saved === 'history') {
        return saved;
      }
    } catch {}
    return 'summary';
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('morya_cash_settlement_subtab', activeTab);
    } catch {}
  }, [activeTab]);

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
  const [isSyncing, setIsSyncing] = useState(false);

  // Member Daily Cash Passbook Modal State
  const [dailyPassbookMember, setDailyPassbookMember] = useState<Member | null>(null);
  const [passbookViewMode, setPassbookViewMode] = useState<'DAILY_SUMMARY' | 'TRANSACTIONS'>('DAILY_SUMMARY');
  const [expandedDayDates, setExpandedDayDates] = useState<string[]>([]);
  const [passbookTypeFilter, setPassbookTypeFilter] = useState<'ALL' | 'INCOME' | 'SETTLE' | 'DEBIT'>('ALL');
  const [passbookDateFilter, setPassbookDateFilter] = useState<string>('');
  const [passbookSearch, setPassbookSearch] = useState<string>('');
  const [passbookSortOrder, setPassbookSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [passbookCopied, setPassbookCopied] = useState<boolean>(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetchCloudDatabase();
    } catch (e) {
      console.warn('Manual sync error:', e);
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  // Treasurer / Vice-Treasurer role permission check
  const loggedMember = members.find(
    (m) =>
      m.fullName.trim().toLowerCase() === (currentUser?.name || '').trim().toLowerCase() ||
      (m.phone && currentUser?.phone && m.phone === currentUser.phone) ||
      (m.email && currentUser?.email && m.email.toLowerCase() === currentUser.email.toLowerCase())
  );

  const effectiveRole = loggedMember?.designation || currentUser.role;

  const isAdmin =
    currentUser.role === 'ॲडमिन' ||
    currentUser.role === 'Admin' ||
    effectiveRole === 'ॲडमिन' ||
    effectiveRole === 'Admin';

  const isTreasurerOrVice =
    isAdmin ||
    effectiveRole === 'खजिनदार' ||
    effectiveRole === 'उपखजिनदार' ||
    effectiveRole === 'Treasurer' ||
    effectiveRole === 'Vice Treasurer' ||
    currentUser.role === 'खजिनदार' ||
    currentUser.role === 'उपखजिनदार' ||
    currentUser.role === 'Treasurer' ||
    currentUser.role === 'Vice Treasurer' ||
    (currentUser.name && (
      currentUser.name.includes('उदय') ||
      currentUser.name.includes('हेरवाडे') ||
      currentUser.name.includes('संकेत') ||
      currentUser.name.includes('कौले')
    ));

  const isCommittee =
    isAdmin ||
    isTreasurerOrVice ||
    isCommitteeMember(effectiveRole) ||
    isCommitteeMember(currentUser?.role);

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

    // Prior Year Filtered Transactions (for Opening Balance carryforward)
    const priorIncomes =
      activeYear === 'ALL'
        ? []
        : incomes.filter((i) =>
            isDateBeforeSelectedYear(i.transactionDate, activeYear, i.financialYear)
          );
    const priorExpenses =
      activeYear === 'ALL'
        ? []
        : expenses.filter((e) =>
            isDateBeforeSelectedYear(e.expenseDate, activeYear, e.financialYear)
          );
    const priorSettlements =
      activeYear === 'ALL'
        ? []
        : settlementsList.filter((s) =>
            isDateBeforeSelectedYear(s.depositDate, activeYear, s.financialYear)
          );

    let totalOpeningCashAll = 0;
    let totalCashReceivedAll = 0;
    let totalAvailableCashAll = 0;
    let totalCashSettledAll = 0;
    let totalCashDebitedAll = 0;
    let totalNetCashAll = 0;

    const memberMap: Record<
      string,
      {
        member: Member;
        openingCashBalance: number;
        cashReceived: number;
        totalAvailableCash: number;
        cashSettled: number;
        cashDebited: number;
        netCashInHand: number;
        pendingSettlement: number;
        pendingCount: number;
      }
    > = {};

    const targetMembers = isCommittee
      ? members
      : members.filter(
          (m) =>
            (loggedMember && m.id === loggedMember.id) ||
            m.fullName.trim().toLowerCase() === (currentUser?.name || '').trim().toLowerCase()
        );

    targetMembers.forEach((m) => {
      // 0. Prior Period Opening Balance: Net cash remaining in hand prior to selected year
      const priorReceived = priorIncomes
        .filter(
          (i) =>
            i.paymentMethod === 'रोख' &&
            i.approvalStatus !== 'रद्द' &&
            (i.cashReceiverMemberId === m.id ||
              (i.cashReceiverName && i.cashReceiverName.trim().toLowerCase() === m.fullName.trim().toLowerCase()))
        )
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

      const priorSettled = priorSettlements
        .filter((s) => s.memberId === m.id && s.approvalStatus === 'मंजूर')
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

      const priorDebited = priorExpenses
        .filter(
          (e) =>
            e.paymentMethod === 'रोख' &&
            e.approvalStatus !== 'रद्द' &&
            (e.paidByMemberId === m.id ||
              (e.paidByMemberName && e.paidByMemberName.trim().toLowerCase() === m.fullName.trim().toLowerCase()))
        )
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const openingCash = Math.max(0, priorReceived - priorSettled - priorDebited);

      // 1. Current Year Cash Inflows
      const received = filteredIncomesByYear
        .filter(
          (i) =>
            i.paymentMethod === 'रोख' &&
            i.approvalStatus !== 'रद्द' &&
            (i.cashReceiverMemberId === m.id ||
              (i.cashReceiverName && i.cashReceiverName.trim().toLowerCase() === m.fullName.trim().toLowerCase()))
        )
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

      const totalAvailable = openingCash + received;

      // 2. Current Year Cash Outflows - Bank/Trust Handover Settlements (Approved)
      const approvedSettled = yearSettlements
        .filter((s) => s.memberId === m.id && s.approvalStatus === 'मंजूर')
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

      // 3. Current Year Cash Outflows - Direct Expense Debits made from cash in hand (Approved or Recorded)
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

      const netInHand = Math.max(0, totalAvailable - approvedSettled - approvedDebited);

      memberMap[m.id] = {
        member: m,
        openingCashBalance: openingCash,
        cashReceived: received,
        totalAvailableCash: totalAvailable,
        cashSettled: approvedSettled,
        cashDebited: approvedDebited,
        netCashInHand: netInHand,
        pendingSettlement: pendingSettled,
        pendingCount,
      };

      totalOpeningCashAll += openingCash;
      totalCashReceivedAll += received;
      totalAvailableCashAll += totalAvailable;
      totalCashSettledAll += approvedSettled;
      totalCashDebitedAll += approvedDebited;
      totalNetCashAll += netInHand;
    });

    // Pending approvals visible to committee members, or own pending settlements for regular members
    const pendingApprovalsList = isTreasurerOrVice
      ? settlementsList.filter((s) => s.approvalStatus === 'प्रलंबित')
      : settlementsList.filter(
          (s) =>
            s.approvalStatus === 'प्रलंबित' &&
            ((loggedMember && s.memberId === loggedMember.id) ||
              (s.memberName && s.memberName.trim().toLowerCase() === (currentUser?.name || '').trim().toLowerCase()))
        );

    const activeCashMembers = Object.values(memberMap)
      .filter((item) => {
        if (!searchQuery.trim()) {
          return (
            item.openingCashBalance > 0 ||
            item.cashReceived > 0 ||
            item.cashSettled > 0 ||
            item.cashDebited > 0 ||
            item.netCashInHand > 0 ||
            item.pendingCount > 0
          );
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
      totalOpeningCashAll,
      totalCashReceivedAll,
      totalAvailableCashAll,
      totalCashSettledAll,
      totalCashDebitedAll,
      totalNetCashAll,
      pendingApprovalsList,
    };
  }, [members, incomes, expenses, filteredIncomesByYear, filteredExpensesByYear, cashSettlements, activeYear, searchQuery, isCommittee, isTreasurerOrVice, loggedMember, currentUser]);

  // Compute Daily Chronological Cash Ledger for Selected Member (Passbook)
  const memberDailyLedger = useMemo(() => {
    if (!dailyPassbookMember) return { entries: [], filteredEntries: [], stats: null };
    const m = dailyPassbookMember;
    const stats = memberCashStats.memberMap[m.id] || {
      openingCashBalance: 0,
      cashReceived: 0,
      totalAvailableCash: 0,
      cashSettled: 0,
      cashDebited: 0,
      netCashInHand: 0,
      pendingSettlement: 0,
      pendingCount: 0,
    };

    // Prior transactions for Opening Balance if activeYear !== 'ALL'
    const priorIncomes =
      activeYear === 'ALL'
        ? []
        : incomes.filter((i) =>
            isDateBeforeSelectedYear(i.transactionDate, activeYear, i.financialYear)
          );
    const priorSettlements =
      activeYear === 'ALL'
        ? []
        : (cashSettlements || []).filter((s) =>
            isDateBeforeSelectedYear(s.depositDate, activeYear, s.financialYear)
          );
    const priorExpenses =
      activeYear === 'ALL'
        ? []
        : expenses.filter((e) =>
            isDateBeforeSelectedYear(e.expenseDate, activeYear, e.financialYear)
          );

    const priorReceived = priorIncomes
      .filter(
        (i) =>
          i.paymentMethod === 'रोख' &&
          i.approvalStatus !== 'रद्द' &&
          (i.cashReceiverMemberId === m.id ||
            (i.cashReceiverName && i.cashReceiverName.trim().toLowerCase() === m.fullName.trim().toLowerCase()))
      )
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const priorSettled = priorSettlements
      .filter((s) => s.memberId === m.id && s.approvalStatus === 'मंजूर')
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    const priorDebited = priorExpenses
      .filter(
        (e) =>
          e.paymentMethod === 'रोख' &&
          e.approvalStatus !== 'रद्द' &&
          (e.paidByMemberId === m.id ||
            (e.paidByMemberName && e.paidByMemberName.trim().toLowerCase() === m.fullName.trim().toLowerCase()))
      )
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const openingCash = Math.max(0, priorReceived - priorSettled - priorDebited);

    // Current year transactions:
    const currentIncomes = filteredIncomesByYear.filter(
      (i) =>
        i.paymentMethod === 'रोख' &&
        i.approvalStatus !== 'रद्द' &&
        (i.cashReceiverMemberId === m.id ||
          (i.cashReceiverName && i.cashReceiverName.trim().toLowerCase() === m.fullName.trim().toLowerCase()))
    );

    const settlementsList = cashSettlements || [];
    const currentSettlements = (activeYear === 'ALL'
      ? settlementsList
      : settlementsList.filter((s) => isDateInSelectedYear(s.depositDate, activeYear, s.financialYear))
    ).filter((s) => s.memberId === m.id);

    const currentDebits = filteredExpensesByYear.filter(
      (e) =>
        e.paymentMethod === 'रोख' &&
        e.approvalStatus !== 'रद्द' &&
        (e.paidByMemberId === m.id ||
          (e.paidByMemberName && e.paidByMemberName.trim().toLowerCase() === m.fullName.trim().toLowerCase()))
    );

    interface DailyLedgerEntry {
      id: string;
      date: string;
      rawDate: string;
      type: 'INCOME' | 'SETTLE' | 'DEBIT' | 'OPENING';
      title: string;
      category: string;
      refNo: string;
      notes?: string;
      proofUrl?: string;
      amount: number;
      signedAmount: number;
      status?: string;
      runningBalance: number;
      extraInfo?: string;
    }

    const rawEntries: Omit<DailyLedgerEntry, 'runningBalance'>[] = [];

    currentIncomes.forEach((i) => {
      rawEntries.push({
        id: `inc-${i.id}`,
        date: i.transactionDate,
        rawDate: i.transactionDate,
        type: 'INCOME',
        title: i.depositorName || 'वर्गणी / देणगीदार',
        category: i.incomeType || 'रोख संकलन',
        refNo: i.receiptNumber || i.transactionNo || i.id,
        notes: i.notes || i.reason,
        proofUrl: i.attachmentUrl,
        amount: Number(i.amount) || 0,
        signedAmount: Number(i.amount) || 0,
        status: i.approvalStatus,
        extraInfo: i.receiptBookNo ? `पावती पुस्तक क्र. ${i.receiptBookNo}` : undefined,
      });
    });

    currentSettlements.forEach((s) => {
      const isApproved = s.approvalStatus === 'मंजूर';
      rawEntries.push({
        id: `set-${s.id}`,
        date: s.depositDate,
        rawDate: s.depositDate,
        type: 'SETTLE',
        title: `बँक भरणा (${s.destination})`,
        category: 'बँक/ट्रस्ट भरणा',
        refNo: s.bankRefNo && s.bankRefNo !== 'नमूद नाही' ? s.bankRefNo : (s.settlementNo || s.id),
        notes: s.notes,
        proofUrl: s.slipPhotoUrl,
        amount: Number(s.amount) || 0,
        signedAmount: isApproved ? -(Number(s.amount) || 0) : 0,
        status: s.approvalStatus,
        extraInfo: isApproved ? `मंजूर (Approved by ${s.approvedBy || 'खजिनदार'})` : `मंजुरी प्रलंबित (Pending Approval)`,
      });
    });

    currentDebits.forEach((e) => {
      rawEntries.push({
        id: `deb-${e.id}`,
        date: e.expenseDate,
        rawDate: e.expenseDate,
        type: 'DEBIT',
        title: `खर्च: ${e.recipientName || 'अधिकृत खर्च'}`,
        category: e.expenseCategory,
        refNo: e.billNumber || e.transactionNo || e.id,
        notes: e.notes || e.reason,
        proofUrl: e.attachmentUrl,
        amount: Number(e.amount) || 0,
        signedAmount: -(Number(e.amount) || 0),
        status: e.approvalStatus,
        extraInfo: e.reason ? e.reason : undefined,
      });
    });

    // Sort chronologically ascending to compute accurate running balance
    rawEntries.sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    let running = openingCash;
    const computedEntries: DailyLedgerEntry[] = [];

    if (activeYear !== 'ALL' && openingCash > 0) {
      computedEntries.push({
        id: 'opening-balance-entry',
        date: `${activeYear} वर्षारंभी शिल्लक`,
        rawDate: '0000-00-00',
        type: 'OPENING',
        title: 'मागील वर्षातून पुढे आणलेली शिल्लक (Opening Cash Balance)',
        category: 'Opening Carryforward',
        refNo: 'CARRYFORWARD',
        amount: openingCash,
        signedAmount: openingCash,
        runningBalance: openingCash,
      });
    }

    rawEntries.forEach((entry) => {
      running += entry.signedAmount;
      computedEntries.push({
        ...entry,
        runningBalance: Math.max(0, running),
      });
    });

    // Apply type filter, date filter, search, and sort order for display
    let filtered = [...computedEntries];

    if (passbookTypeFilter === 'INCOME') {
      filtered = filtered.filter((e) => e.type === 'INCOME' || e.type === 'OPENING');
    } else if (passbookTypeFilter === 'SETTLE') {
      filtered = filtered.filter((e) => e.type === 'SETTLE');
    } else if (passbookTypeFilter === 'DEBIT') {
      filtered = filtered.filter((e) => e.type === 'DEBIT');
    }

    if (passbookDateFilter) {
      filtered = filtered.filter((e) => e.rawDate.startsWith(passbookDateFilter) || e.date.includes(passbookDateFilter));
    }

    if (passbookSearch.trim()) {
      const q = passbookSearch.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.refNo.toLowerCase().includes(q) ||
          (e.notes && e.notes.toLowerCase().includes(q))
      );
    }

    if (passbookSortOrder === 'DESC') {
      filtered.reverse();
    }

    // Compute Day-Wise Summary (Grouped by rawDate for daily tally)
    const uniqueDates = Array.from(
      new Set(rawEntries.map((e) => e.rawDate).filter((d) => d && d !== '0000-00-00'))
    ).sort();

    let dayRunning = openingCash;
    const dayWiseSummaryList: Array<{
      rawDate: string;
      date: string;
      cashReceived: number;
      incomesList: typeof currentIncomes;
      cashSettled: number;
      settlementsList: typeof currentSettlements;
      cashDebited: number;
      debitsList: typeof currentDebits;
      netDayChange: number;
      endOfDayBalance: number;
    }> = [];

    uniqueDates.forEach((d) => {
      const dayIncomes = currentIncomes.filter((i) => i.transactionDate === d);
      const daySettles = currentSettlements.filter((s) => s.depositDate === d);
      const dayDebits = currentDebits.filter((e) => e.expenseDate === d);

      const dayRec = dayIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const daySet = daySettles.filter((s) => s.approvalStatus === 'मंजूर').reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      const dayDeb = dayDebits.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const netChange = dayRec - daySet - dayDeb;
      dayRunning += netChange;

      dayWiseSummaryList.push({
        rawDate: d,
        date: d,
        cashReceived: dayRec,
        incomesList: dayIncomes,
        cashSettled: daySet,
        settlementsList: daySettles,
        cashDebited: dayDeb,
        debitsList: dayDebits,
        netDayChange: netChange,
        endOfDayBalance: Math.max(0, dayRunning),
      });
    });

    let filteredDayWise = [...dayWiseSummaryList];

    if (passbookDateFilter) {
      filteredDayWise = filteredDayWise.filter((dw) => dw.rawDate.startsWith(passbookDateFilter));
    }

    if (passbookSearch.trim()) {
      const q = passbookSearch.toLowerCase();
      filteredDayWise = filteredDayWise.filter(
        (dw) =>
          dw.date.toLowerCase().includes(q) ||
          dw.incomesList.some((i) => (i.depositorName || '').toLowerCase().includes(q) || (i.receiptNumber || '').toLowerCase().includes(q)) ||
          dw.settlementsList.some((s) => s.destination.toLowerCase().includes(q) || (s.bankRefNo || '').toLowerCase().includes(q)) ||
          dw.debitsList.some((e) => (e.recipientName || '').toLowerCase().includes(q) || (e.billNumber || '').toLowerCase().includes(q))
      );
    }

    if (passbookSortOrder === 'DESC') {
      filteredDayWise.reverse();
    }

    return {
      entries: computedEntries,
      filteredEntries: filtered,
      dayWiseSummary: dayWiseSummaryList,
      filteredDayWise,
      stats: {
        openingCash,
        totalReceived: currentIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0),
        totalSettled: currentSettlements.filter(s => s.approvalStatus === 'मंजूर').reduce((s, item) => s + (Number(item.amount) || 0), 0),
        totalDebited: currentDebits.reduce((s, e) => s + (Number(e.amount) || 0), 0),
        netInHand: Math.max(0, running),
        pendingSettlementsCount: currentSettlements.filter(s => s.approvalStatus === 'प्रलंबित').length,
        pendingSettlementsAmount: currentSettlements.filter(s => s.approvalStatus === 'प्रलंबित').reduce((s, item) => s + (Number(item.amount) || 0), 0),
      }
    };
  }, [
    dailyPassbookMember,
    incomes,
    expenses,
    cashSettlements,
    filteredIncomesByYear,
    filteredExpensesByYear,
    activeYear,
    memberCashStats,
    passbookTypeFilter,
    passbookDateFilter,
    passbookSearch,
    passbookSortOrder,
  ]);

  // Share Daily Passbook Statement via WhatsApp
  const handleShareDailyPassbookWhatsApp = () => {
    if (!dailyPassbookMember || !memberDailyLedger.stats) return;
    const m = dailyPassbookMember;
    const st = memberDailyLedger.stats;

    let text = `🚩 *मोरया ग्रुप मित्र मंडळ (ट्रस्ट)* 🚩\n`;
    text += `*दैनिक रोख हिशोब व टॅली पासबुक (Daily Cash Tally)*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👤 *सभासद:* ${m.fullName} (${m.designation || 'सभासद'})\n`;
    text += `🏷️ *कोड:* ${m.memberCode} | 📱 *मो:* ${m.phone}\n`;
    text += `📅 *आर्थिक वर्ष:* ${activeYear}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    if (st.openingCash > 0) {
      text += `१️⃣ मागील वर्षाची शिल्लक: ₹${st.openingCash.toLocaleString('en-IN')}\n`;
    }
    text += `२️⃣ एकूण स्वीकारलेली रोख: +₹${st.totalReceived.toLocaleString('en-IN')}\n`;
    text += `३️⃣ बँकेत/ट्रस्टकडे भरणा: -₹${st.totalSettled.toLocaleString('en-IN')}\n`;
    text += `४️⃣ रोखीतून केलेला खर्च: -₹${st.totalDebited.toLocaleString('en-IN')}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *निव्वळ शिल्लक रोख रक्कम: ₹${st.netInHand.toLocaleString('en-IN')}* 💰\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `📅 *दिनांकनिहाय रोख सारांश (Day-wise Tally):*\n`;
    const recentDays = [...memberDailyLedger.dayWiseSummary].reverse().slice(0, 10);
    recentDays.forEach((dw) => {
      text += `• *[${dw.date}]* जमा: +₹${dw.cashReceived.toLocaleString('en-IN')}`;
      if (dw.cashSettled > 0) text += ` | भरणा: -₹${dw.cashSettled.toLocaleString('en-IN')}`;
      if (dw.cashDebited > 0) text += ` | खर्च: -₹${dw.cashDebited.toLocaleString('en-IN')}`;
      text += ` ➔ *शिल्लक: ₹${dw.endOfDayBalance.toLocaleString('en-IN')}*\n`;
    });

    text += `\n🔗 *अधिक माहितीसाठी ॲपमध्ये पहा:*\n${window.location.origin}`;

    const cleanPhone = m.phone ? '91' + m.phone.replace(/\D/g, '').slice(-10) : '';
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Copy Daily Passbook Text to Clipboard
  const handleCopyDailyPassbook = () => {
    if (!dailyPassbookMember || !memberDailyLedger.stats) return;
    const m = dailyPassbookMember;
    const st = memberDailyLedger.stats;

    let text = `🚩 मोरया ग्रुप मित्र मंडळ (ट्रस्ट) 🚩\n`;
    text += `दैनिक रोख हिशोब व व्यवहार पासबुक\n`;
    text += `सभासद: ${m.fullName} (${m.designation || 'सभासद'}) | कोड: ${m.memberCode}\n`;
    text += `वर्ष: ${activeYear}\n`;
    text += `----------------------------------------\n`;
    if (st.openingCash > 0) text += `१. मागील शिल्लक: ₹${st.openingCash.toLocaleString('en-IN')}\n`;
    text += `२. स्वीकारलेली रोख: +₹${st.totalReceived.toLocaleString('en-IN')}\n`;
    text += `३. बँक भरणा: -₹${st.totalSettled.toLocaleString('en-IN')}\n`;
    text += `४. रोख खर्च: -₹${st.totalDebited.toLocaleString('en-IN')}\n`;
    text += `५. निव्वळ शिल्लक रोख: ₹${st.netInHand.toLocaleString('en-IN')}\n`;
    text += `----------------------------------------\n`;

    navigator.clipboard.writeText(text);
    setPassbookCopied(true);
    setTimeout(() => setPassbookCopied(false), 2000);
  };

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
      bankRefNo: settleBankRefNo.trim() || 'नमूद नाही',
      slipPhotoUrl: settleSlipPhotoUrl.trim() || undefined,
      notes: settleNotes.trim() || 'नमूद नाही',
      financialYear: getFinancialYearFromDate(settleDate),
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
      billNumber: debitBillNo.trim() || 'नमूद नाही',
      attachmentUrl: debitAttachmentUrl.trim() || undefined,
      notes: debitNotes.trim() || 'नमूद नाही',
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
    const allDebits = filteredExpensesByYear.filter(
      (e) => e.paymentMethod === 'रोख' && (e.isPaidFromCashInHand || Boolean(e.paidByMemberId))
    );
    if (isCommittee) return allDebits;
    const userNorm = (currentUser?.name || '').trim().toLowerCase();
    return allDebits.filter(
      (e) =>
        (loggedMember && (e.paidByMemberId === loggedMember.id || e.linkedMemberId === loggedMember.id)) ||
        (e.paidByMemberName && e.paidByMemberName.trim().toLowerCase() === userNorm) ||
        (e.createdBy && e.createdBy.trim().toLowerCase() === userNorm)
    );
  }, [filteredExpensesByYear, isCommittee, loggedMember, currentUser]);

  // Filtered History Settlements
  const filteredHistory = useMemo(() => {
    let list = cashSettlements || [];
    if (!isCommittee) {
      const userNorm = (currentUser?.name || '').trim().toLowerCase();
      list = list.filter(
        (s) =>
          (loggedMember && s.memberId === loggedMember.id) ||
          (s.memberName && s.memberName.trim().toLowerCase() === userNorm) ||
          (s.createdBy && s.createdBy.trim().toLowerCase() === userNorm)
      );
    }
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
  }, [cashSettlements, isCommittee, loggedMember, currentUser, historyFilter, searchQuery]);

  const isLoggedIn = currentUser?.isLoggedIn !== false && Boolean(currentUser?.name);

  if (!isLoggedIn) {
    return (
      <RbacGuard
        currentRole={currentUser?.role}
        title="रोख संकलन व भरणा हिशोब पाहण्यासाठी लॉगिन आवश्यक"
        message="स्वतःचा किंवा मंडळाचा रोख संकलन, बँक भरणा व थेट रोख खर्च हिशोब पाहण्यासाठी कृपया लॉगिन करा."
        onLoginClick={onOpenLogin}
      />
    );
  }

  return (
    <div className="space-y-6 my-4">
      {/* Top Banner & Control Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border border-slate-700 font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1 mt-0.5"
              title="मुख्य डॅशबोर्डवर परत जा"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">← मुख्य पान</span>
            </button>
          )}
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-2xl flex items-center justify-center font-bold shrink-0 mt-0.5">
            <Wallet className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
                रोख संकलन, भरणा व ऑडिट डेबिट हिशोब
              </h2>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-md text-xs font-black shrink-0">
                Trust Cash Audit System
              </span>
              {memberCashStats.pendingApprovalsList.length > 0 && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-md text-[11px] font-black animate-pulse flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {memberCashStats.pendingApprovalsList.length} प्रलंबित मंजुऱ्या
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              सभासदांनी जमा केलेली रोख रक्कम, बँकेत भरणा आणि संकलनातून थेट केलेला अधिकृत खर्च (ऑडिट व्हाउचर).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full xl:w-auto justify-start xl:justify-end shrink-0 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-100 dark:border-slate-700">
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
              <option value="२०२६">२०२६</option>
              <option value="२०२७">२०२७</option>
              <option value="२०२५">२०२५</option>
              <option value="२०२४">२०२४</option>
              <option value="ALL">सर्व वर्षे</option>
            </select>
          </div>

          {/* Quick Refresh / Cloud Sync Button */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            title="क्लाउड डेटाबेसमधून ताजी माहिती मिळवा"
            className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all shrink-0 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-700 dark:text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">सिंक</span>
          </button>

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
            <ReceiptIndianRupee className="w-4 h-4" />
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
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isCommittee ? '१. एकूण उपलब्ध रोख (Available)' : '१. माझे उपलब्ध रोख संकलन (My Available)'}
            </p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              ₹{memberCashStats.totalAvailableCashAll.toLocaleString('en-IN')}
            </p>
            {activeYear !== 'ALL' && memberCashStats.totalOpeningCashAll > 0 ? (
              <p className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold mt-0.5 truncate" title={`मागील शिल्लक: ₹${memberCashStats.totalOpeningCashAll.toLocaleString('en-IN')} + चालू: ₹${memberCashStats.totalCashReceivedAll.toLocaleString('en-IN')}`}>
                (मागील: ₹{memberCashStats.totalOpeningCashAll.toLocaleString('en-IN')} + चालू: ₹{memberCashStats.totalCashReceivedAll.toLocaleString('en-IN')})
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 mt-0.5">
                चालू संकलन: ₹{memberCashStats.totalCashReceivedAll.toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-2xl flex items-center justify-center shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isCommittee ? '२. बँकेत/ट्रस्टकडे जमा (Settled)' : '२. माझा बँकेत भरणा (My Settled)'}
            </p>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
              ₹{memberCashStats.totalCashSettledAll.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-rose-200 dark:border-rose-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 rounded-2xl flex items-center justify-center shrink-0">
            <ReceiptIndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isCommittee ? '३. रोखीतून खर्च (Direct Debits)' : '३. माझा रोखीतून खर्च (My Debits)'}
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
              {isCommittee ? '४. निव्वळ शिल्लक रोख (Net in Hand)' : '४. माझी शिल्लक रोख (My Net in Hand)'}
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
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        onApproveCashSettlement(item.id, currentUser.name, currentUser.role)
                      }
                      className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 min-w-[120px]"
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
                    {isAdmin && onDeleteCashSettlement && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`बँक भरणा विनंती क्र. ${item.settlementNo || ''} (₹${item.amount}) पूर्णपणे हटवायची (Delete) आहे का?`)) {
                            onDeleteCashSettlement(item.id);
                          }
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-rose-900/80 text-rose-300 font-bold text-xs rounded-xl border border-rose-500/30 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                        title="ही नोंद कायमची हटवा (Admin Delete)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>हटवा</span>
                      </button>
                    )}
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
          <span>{isCommittee ? 'सभासदनिहाय शिल्लक रोख हिशोब' : 'माझा शिल्लक रोख हिशोब'} ({memberCashStats.activeCashMembers.length})</span>
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
          <ReceiptIndianRupee className="w-4 h-4" />
          <span>{isCommittee ? 'रोखीतून केलेल्या खर्चाच्या नोंदी / Audit Debits' : 'माझ्या रोख खर्चाच्या नोंदी / Audit Debits'} ({directCashDebitsList.length})</span>
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
          <span>{isCommittee ? 'गेल्या बँक भरणा नोंदींचा हिशोब इतिहास' : 'माझा बँक भरणा हिशोब इतिहास'} ({filteredHistory.length})</span>
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
                {isCommittee
                  ? 'सध्या कोणत्याही सभासदाकडे रोख शिल्लक नाही'
                  : 'आपल्याकडे सध्या कोणतीही शिल्लक रोख रक्कम नाही'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {isCommittee
                  ? 'जेव्हा कोणी सभासद रोख स्वरूपात वर्गणी किंवा देणगी स्वीकारेल, तेव्हा त्यांची नोंद व शिल्लक हिशोब येथे दिसेल.'
                  : 'जेव्हा आपण रोख स्वरूपात वर्गणी स्वीकाराल किंवा भरणा कराल, तेव्हा आपला सविस्तर रोख हिशोब येथे दिसेल.'}
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
                      {activeYear !== 'ALL' && (
                        <div
                          onClick={() => {
                            setDailyPassbookMember(item.member);
                            setPassbookTypeFilter('ALL');
                            setPassbookDateFilter('');
                            setPassbookSearch('');
                          }}
                          className="flex justify-between items-center bg-amber-50/80 dark:bg-amber-950/30 px-2 py-1 rounded-lg border border-amber-200/60 dark:border-amber-800/40 cursor-pointer hover:bg-amber-100/80 transition-colors"
                          title="मागील वर्षाची शिल्लक तपशील पहा"
                        >
                          <span className="text-amber-800 dark:text-amber-300 font-bold">१. मागील वर्षाची शिल्लक (Opening):</span>
                          <span className="font-black text-amber-900 dark:text-amber-200">
                            ₹{item.openingCashBalance.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                      <div
                        onClick={() => {
                          setDailyPassbookMember(item.member);
                          setPassbookTypeFilter('INCOME');
                          setPassbookDateFilter('');
                          setPassbookSearch('');
                        }}
                        className="flex justify-between px-1.5 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        title="स्वीकारलेल्या रोख रकमेचा तपशील पहा"
                      >
                        <span className="text-slate-600 dark:text-slate-300">२. चालू वर्षात स्वीकारलेली रोख:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          ₹{item.cashReceived.toLocaleString('en-IN')}
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </span>
                      </div>
                      <div
                        onClick={() => {
                          setDailyPassbookMember(item.member);
                          setPassbookTypeFilter('SETTLE');
                          setPassbookDateFilter('');
                          setPassbookSearch('');
                        }}
                        className="flex justify-between px-1.5 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        title="बँक भरणा इतिहास पहा"
                      >
                        <span className="text-slate-600 dark:text-slate-300">३. बँकेत/ट्रस्टकडे जमा (भरणा):</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          - ₹{item.cashSettled.toLocaleString('en-IN')}
                          <ChevronRight className="w-3 h-3 text-blue-400" />
                        </span>
                      </div>
                      <div
                        onClick={() => {
                          setDailyPassbookMember(item.member);
                          setPassbookTypeFilter('DEBIT');
                          setPassbookDateFilter('');
                          setPassbookSearch('');
                        }}
                        className="flex justify-between px-1.5 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        title="रोखीतून केलेल्या खर्चाचा तपशील पहा"
                      >
                        <span className="text-slate-600 dark:text-slate-300">४. रोखीतून केलेला खर्च (Audit Debit):</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          - ₹{item.cashDebited.toLocaleString('en-IN')}
                          <ChevronRight className="w-3 h-3 text-rose-400" />
                        </span>
                      </div>
                      <div
                        onClick={() => {
                          setDailyPassbookMember(item.member);
                          setPassbookTypeFilter('ALL');
                          setPassbookDateFilter('');
                          setPassbookSearch('');
                        }}
                        className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-black px-1.5 py-0.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer transition-colors"
                        title="संपूर्ण दैनिक रोख पासबूक उघडा"
                      >
                        <span className="text-emerald-800 dark:text-emerald-300">५. शिल्लक रोख रक्कम (Net in Hand):</span>
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

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2">
                    {/* Primary Button: Daily Transaction Ledger / Passbook */}
                    <button
                      type="button"
                      onClick={() => {
                        setDailyPassbookMember(item.member);
                        setPassbookTypeFilter('ALL');
                        setPassbookDateFilter('');
                        setPassbookSearch('');
                      }}
                      className="w-full py-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:to-slate-700 text-amber-300 font-black text-xs rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 border border-amber-500/30"
                    >
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <span>📋 दैनिक रोख व्यवहार (Daily Passbook)</span>
                    </button>

                    <div className="flex gap-2">
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
                        <ReceiptIndianRupee className="w-3.5 h-3.5" />
                        <span>रोखीतून खर्च</span>
                      </button>
                    </div>
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
              <ReceiptIndianRupee className="w-4 h-4" />
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
                    {isAdmin && <th className="p-3 text-right">कृती</th>}
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
                      {isAdmin && (
                        <td className="p-3 text-right">
                          {onDeleteCashSettlement && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`बँक भरणा नोंद क्र. ${item.settlementNo || ''} (₹${item.amount}) पूर्णपणे हटवायची (Delete) आहे का?`)) {
                                  onDeleteCashSettlement(item.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                              title="नोंद कायमची हटवा (Admin Only Delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      )}
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
                  <ReceiptIndianRupee className="w-5 h-5" />
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

      {/* ─── Member Daily Cash Passbook Modal ─── */}
      {dailyPassbookMember && memberDailyLedger.stats && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl border-2 border-amber-400 p-0.5 bg-slate-950 flex items-center justify-center text-amber-300 font-bold text-sm shrink-0 shadow">
                  {dailyPassbookMember.photoUrl ? (
                    <img
                      src={dailyPassbookMember.photoUrl}
                      alt={dailyPassbookMember.fullName}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    dailyPassbookMember.fullName.slice(0, 2)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-md font-mono font-black text-[11px]">
                      {dailyPassbookMember.memberCode}
                    </span>
                    <span className="px-2.5 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-md font-bold text-[11px]">
                      {dailyPassbookMember.designation || 'सभासद'}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md font-bold text-[11px]">
                      वर्ष: {activeYear}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white mt-1 truncate">
                    {dailyPassbookMember.fullName} - दैनिक रोख पासबुक
                  </h3>
                  <p className="text-xs text-slate-400">
                    मो: {dailyPassbookMember.phone || 'नमूद नाही'} | एकूण {memberDailyLedger.entries.length} रोख व्यवहार नोंदी
                  </p>
                </div>
              </div>

              {/* Action Buttons: WhatsApp Share, Copy, Close */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleShareDailyPassbookWhatsApp}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow transition-all active:scale-95"
                  title="व्हॉट्सॲपवर पाठवा"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">व्हॉट्सॲप</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyDailyPassbook}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all active:scale-95"
                  title="हिशोब कॉपी करा"
                >
                  {passbookCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <BookOpen className="w-3.5 h-3.5" />}
                  <span>{passbookCopied ? 'कॉपी झाले!' : 'कॉपी'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDailyPassbookMember(null)}
                  className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl cursor-pointer transition-colors"
                  title="बंद करा"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Summary 5-Box Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {activeYear !== 'ALL' && (
                  <div className="bg-amber-50/90 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-200 dark:border-amber-800/50">
                    <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                      १. मागील शिल्लक (Opening)
                    </p>
                    <p className="text-base font-black text-amber-900 dark:text-amber-200 mt-0.5">
                      ₹{memberDailyLedger.stats.openingCash.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                      मागील वर्षाची शिल्लक
                    </p>
                  </div>
                )}

                <div className="bg-emerald-50/90 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
                  <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    २. स्वीकारलेली रोख (+)
                  </p>
                  <p className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    + ₹{memberDailyLedger.stats.totalReceived.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    चालू वर्षात जमा
                  </p>
                </div>

                <div className="bg-blue-50/90 dark:bg-blue-950/30 p-3 rounded-2xl border border-blue-200 dark:border-blue-800/50">
                  <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                    ३. बँकेत/ट्रस्टकडे भरणा (-)
                  </p>
                  <p className="text-base font-black text-blue-700 dark:text-blue-300 mt-0.5">
                    - ₹{memberDailyLedger.stats.totalSettled.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                    {memberDailyLedger.stats.pendingSettlementsCount > 0 ? `(₹${memberDailyLedger.stats.pendingSettlementsAmount.toLocaleString('en-IN')} प्रलंबित)` : 'मंजूर भरणा'}
                  </p>
                </div>

                <div className="bg-rose-50/90 dark:bg-rose-950/30 p-3 rounded-2xl border border-rose-200 dark:border-rose-800/50">
                  <p className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                    ४. रोखीतून खर्च (-)
                  </p>
                  <p className="text-base font-black text-rose-700 dark:text-rose-300 mt-0.5">
                    - ₹{memberDailyLedger.stats.totalDebited.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                    ऑडिट व्हाऊचर्स
                  </p>
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-3 rounded-2xl shadow col-span-2 sm:col-span-1 border border-emerald-500">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-100">
                    ५. शिल्लक रोख रक्कम
                  </p>
                  <p className="text-lg font-black text-white mt-0.5">
                    ₹{memberDailyLedger.stats.netInHand.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-emerald-200 mt-0.5">
                    हातातील निव्वळ रोख
                  </p>
                </div>
              </div>

              {/* Modal View Mode Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2">
                <button
                  type="button"
                  onClick={() => setPassbookViewMode('DAILY_SUMMARY')}
                  className={`py-2.5 px-4 text-xs font-black flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
                    passbookViewMode === 'DAILY_SUMMARY'
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-t-xl'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>📅 दिवसनिहाय सारांश व टॅली (Daily Tally) ({memberDailyLedger.dayWiseSummary.length} दिवस)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPassbookViewMode('TRANSACTIONS')}
                  className={`py-2.5 px-4 text-xs font-black flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
                    passbookViewMode === 'TRANSACTIONS'
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-t-xl'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>📑 सर्व पावत्यांचा तपशील (All Transactions) ({memberDailyLedger.entries.length})</span>
                </button>
              </div>

              {/* ─── TAB 1: DAY-WISE DAILY SUMMARY TABLE (DAILY TALLY) ─── */}
              {passbookViewMode === 'DAILY_SUMMARY' && (
                <div className="space-y-3">
                  {/* Quick search and date filter for Day-wise summary */}
                  <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-emerald-600" />
                      <span>प्रत्येक दिवसाचा एकूण जमा, भरणा व शिल्लक हिशोब टॅली करा:</span>
                    </p>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={passbookSearch}
                          onChange={(e) => setPassbookSearch(e.target.value)}
                          placeholder="तारीख किंवा नाव शोधा..."
                          className="pl-8 pr-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 w-44"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setPassbookSortOrder(passbookSortOrder === 'DESC' ? 'ASC' : 'DESC')}
                        className="p-1.5 px-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs flex items-center gap-1 shrink-0"
                        title={passbookSortOrder === 'DESC' ? 'नवीनतम प्रथम (Newest First)' : 'सुरुवातीपासून (Oldest First)'}
                      >
                        <ArrowUpDown className="w-3 h-3 text-emerald-600" />
                        <span>{passbookSortOrder === 'DESC' ? 'नवीनतम' : 'सुरुवातीपासून'}</span>
                      </button>
                    </div>
                  </div>

                  {memberDailyLedger.filteredDayWise.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="w-12 h-12 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        कोणत्याही दिवसाच्या नोंदी आढळल्या नाहीत
                      </h4>
                      <p className="text-xs text-slate-500">
                        या सभासदाने निवडलेल्या वर्षात रोख संकलन स्वीकारलेले नाही.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] font-black">
                              <th className="py-3 px-3.5">दिनांक (Date)</th>
                              <th className="py-3 px-3 text-right">स्वीकारलेली रोख (+)</th>
                              <th className="py-3 px-3 text-right">बँकेत भरणा (-)</th>
                              <th className="py-3 px-3 text-right">रोख खर्च (-)</th>
                              <th className="py-3 px-3 text-right">दिवसाचा बदल (Net Change)</th>
                              <th className="py-3 px-3.5 text-right">दिवसाअखेर शिल्लक (Closing)</th>
                              <th className="py-3 px-3 text-center">तपशील</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {/* Opening Carryforward Row */}
                            {activeYear !== 'ALL' && memberDailyLedger.stats.openingCash > 0 && (
                              <tr className="bg-amber-50/70 dark:bg-amber-950/20 font-bold border-b border-amber-200/60">
                                <td className="py-2.5 px-3.5 text-amber-900 dark:text-amber-200">
                                  {activeYear} वर्षारंभी शिल्लक (Opening)
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-400">-</td>
                                <td className="py-2.5 px-3 text-right text-slate-400">-</td>
                                <td className="py-2.5 px-3 text-right text-slate-400">-</td>
                                <td className="py-2.5 px-3 text-right text-amber-700 dark:text-amber-300 font-black">+ ₹{memberDailyLedger.stats.openingCash.toLocaleString('en-IN')}</td>
                                <td className="py-2.5 px-3.5 text-right font-black text-amber-900 dark:text-amber-200">₹{memberDailyLedger.stats.openingCash.toLocaleString('en-IN')}</td>
                                <td className="py-2.5 px-3 text-center text-slate-400 text-[10px]">Opening</td>
                              </tr>
                            )}

                            {memberDailyLedger.filteredDayWise.map((day) => {
                              const isExpanded = expandedDayDates.includes(day.rawDate);
                              return (
                                <React.Fragment key={day.rawDate}>
                                  <tr
                                    onClick={() => {
                                      setExpandedDayDates((prev) =>
                                        prev.includes(day.rawDate)
                                          ? prev.filter((d) => d !== day.rawDate)
                                          : [...prev, day.rawDate]
                                      );
                                    }}
                                    className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                                  >
                                    {/* Date */}
                                    <td className="py-3 px-3.5 whitespace-nowrap font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                      <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-emerald-600' : ''}`} />
                                      <span>{day.date}</span>
                                    </td>

                                    {/* Cash Received */}
                                    <td className="py-3 px-3 text-right whitespace-nowrap">
                                      {day.cashReceived > 0 ? (
                                        <div>
                                          <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                            + ₹{day.cashReceived.toLocaleString('en-IN')}
                                          </span>
                                          <span className="text-[10px] text-slate-400 block font-normal">
                                            ({day.incomesList.length} पावत्या)
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-300 dark:text-slate-600">-</span>
                                      )}
                                    </td>

                                    {/* Bank Settled */}
                                    <td className="py-3 px-3 text-right whitespace-nowrap">
                                      {day.cashSettled > 0 ? (
                                        <div>
                                          <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                                            - ₹{day.cashSettled.toLocaleString('en-IN')}
                                          </span>
                                          <span className="text-[10px] text-slate-400 block font-normal">
                                            ({day.settlementsList.length} भरणा)
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-300 dark:text-slate-600">-</span>
                                      )}
                                    </td>

                                    {/* Cash Debited */}
                                    <td className="py-3 px-3 text-right whitespace-nowrap">
                                      {day.cashDebited > 0 ? (
                                        <div>
                                          <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                                            - ₹{day.cashDebited.toLocaleString('en-IN')}
                                          </span>
                                          <span className="text-[10px] text-slate-400 block font-normal">
                                            ({day.debitsList.length} खर्च)
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-300 dark:text-slate-600">-</span>
                                      )}
                                    </td>

                                    {/* Net Day Change */}
                                    <td className="py-3 px-3 text-right whitespace-nowrap font-bold">
                                      <span className={day.netDayChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                        {day.netDayChange >= 0 ? '+' : ''} ₹{day.netDayChange.toLocaleString('en-IN')}
                                      </span>
                                    </td>

                                    {/* End of Day Closing Balance */}
                                    <td className="py-3 px-3.5 text-right whitespace-nowrap font-black text-sm text-slate-900 dark:text-slate-100 bg-slate-50/70 dark:bg-slate-800/70">
                                      ₹{day.endOfDayBalance.toLocaleString('en-IN')}
                                    </td>

                                    {/* Action */}
                                    <td className="py-3 px-3 text-center whitespace-nowrap">
                                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 text-slate-600 dark:text-slate-300 font-bold rounded-lg text-[10px] inline-flex items-center gap-1">
                                        <Eye className="w-3 h-3 text-emerald-600" />
                                        <span>{isExpanded ? 'लपवा' : 'तपशील'}</span>
                                      </span>
                                    </td>
                                  </tr>

                                  {/* Expanded Day Details (Receipts, Settlements, Debits) */}
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan={7} className="p-3 bg-slate-50/90 dark:bg-slate-850 border-y border-slate-200 dark:border-slate-700">
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                              📅 {day.date} रोजीच्या सर्व व्यवहारांचा तपशील:
                                            </h5>
                                            <span className="text-[11px] text-slate-500">
                                              एकूण {day.incomesList.length + day.settlementsList.length + day.debitsList.length} नोंदी
                                            </span>
                                          </div>

                                          {/* Receipts Inflow List */}
                                          {day.incomesList.length > 0 && (
                                            <div className="space-y-1.5">
                                              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                                <ArrowDownCircle className="w-3.5 h-3.5" />
                                                स्वीकारलेली रोख (Cash Receipts - {day.incomesList.length}):
                                              </p>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {day.incomesList.map((inc) => (
                                                  <div key={inc.id} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-800/40 flex justify-between items-start gap-2 shadow-xs">
                                                    <div>
                                                      <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                                        {inc.depositorName}
                                                      </span>
                                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                        <span>{inc.receiptNumber ? `पावती क्र. ${inc.receiptNumber}` : inc.transactionNo}</span>
                                                        <span> • {inc.incomeType}</span>
                                                      </div>
                                                      {inc.notes && <p className="text-[10px] text-slate-400 italic">"{inc.notes}"</p>}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                                                        + ₹{Number(inc.amount).toLocaleString('en-IN')}
                                                      </span>
                                                      {inc.attachmentUrl && (
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewProofUrl(inc.attachmentUrl || null);
                                                          }}
                                                          className="block text-[9px] text-amber-500 font-bold hover:underline mt-0.5"
                                                        >
                                                          📷 फोटो पहा
                                                        </button>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Bank Settlements List */}
                                          {day.settlementsList.length > 0 && (
                                            <div className="space-y-1.5">
                                              <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                                <Landmark className="w-3.5 h-3.5" />
                                                बँकेत/ट्रस्टकडे भरणा (Bank Settlements - {day.settlementsList.length}):
                                              </p>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {day.settlementsList.map((st) => (
                                                  <div key={st.id} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-800/40 flex justify-between items-start gap-2 shadow-xs">
                                                    <div>
                                                      <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                                        {st.destination}
                                                      </span>
                                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                        <span>{st.bankRefNo && st.bankRefNo !== 'नमूद नाही' ? `संदर्भ: ${st.bankRefNo}` : st.settlementNo}</span>
                                                        <span className={st.approvalStatus === 'मंजूर' ? 'text-emerald-500 font-bold ml-1' : 'text-amber-500 font-bold ml-1'}>
                                                          • {st.approvalStatus}
                                                        </span>
                                                      </div>
                                                      {st.notes && <p className="text-[10px] text-slate-400 italic">"{st.notes}"</p>}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                      <span className="font-black text-blue-600 dark:text-blue-400 text-xs">
                                                        - ₹{Number(st.amount).toLocaleString('en-IN')}
                                                      </span>
                                                      {st.slipPhotoUrl && (
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewProofUrl(st.slipPhotoUrl || null);
                                                          }}
                                                          className="block text-[9px] text-amber-500 font-bold hover:underline mt-0.5"
                                                        >
                                                          📷 स्लिप फोटो
                                                        </button>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Expense Debits List */}
                                          {day.debitsList.length > 0 && (
                                            <div className="space-y-1.5">
                                              <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                                                <ReceiptIndianRupee className="w-3.5 h-3.5" />
                                                रोखीतून खर्च (Expense Debits - {day.debitsList.length}):
                                              </p>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {day.debitsList.map((deb) => (
                                                  <div key={deb.id} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-rose-200 dark:border-rose-800/40 flex justify-between items-start gap-2 shadow-xs">
                                                    <div>
                                                      <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                                        {deb.recipientName || 'अधिकृत खर्च'}
                                                      </span>
                                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                        <span>{deb.billNumber ? `बिल क्र. ${deb.billNumber}` : deb.transactionNo}</span>
                                                        <span> • {deb.expenseCategory}</span>
                                                      </div>
                                                      {deb.reason && <p className="text-[10px] text-slate-400 italic">"{deb.reason}"</p>}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                      <span className="font-black text-rose-600 dark:text-rose-400 text-xs">
                                                        - ₹{Number(deb.amount).toLocaleString('en-IN')}
                                                      </span>
                                                      {deb.attachmentUrl && (
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewProofUrl(deb.attachmentUrl || null);
                                                          }}
                                                          className="block text-[9px] text-amber-500 font-bold hover:underline mt-0.5"
                                                        >
                                                          📷 बिल फोटो
                                                        </button>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 2: INDIVIDUAL TRANSACTIONS TABLE ─── */}
              {passbookViewMode === 'TRANSACTIONS' && (
                <div className="space-y-4">
                  {/* Filter Controls Strip */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                    {/* Type Filter Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 md:pb-0">
                      <button
                        type="button"
                        onClick={() => setPassbookTypeFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          passbookTypeFilter === 'ALL'
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        सर्व नोंदी ({memberDailyLedger.entries.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPassbookTypeFilter('INCOME')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          passbookTypeFilter === 'INCOME'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50'
                        }`}
                      >
                        <span>🟢 स्वीकारलेली रोख</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPassbookTypeFilter('SETTLE')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          passbookTypeFilter === 'SETTLE'
                            ? 'bg-blue-600 text-white shadow'
                            : 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        <span>🔵 बँक भरणा</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPassbookTypeFilter('DEBIT')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          passbookTypeFilter === 'DEBIT'
                            ? 'bg-rose-600 text-white shadow'
                            : 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50'
                        }`}
                      >
                        <span>🔴 रोख खर्च</span>
                      </button>
                    </div>

                    {/* Search, Date Filter & Sort */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div className="relative flex-1 sm:w-44">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={passbookSearch}
                          onChange={(e) => setPassbookSearch(e.target.value)}
                          placeholder="शोध (पावती, नाव)..."
                          className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <input
                        type="date"
                        value={passbookDateFilter}
                        onChange={(e) => setPassbookDateFilter(e.target.value)}
                        className="px-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
                        title="विशिष्ट तारखेनुसार फिल्टर करा"
                      />

                      {passbookDateFilter && (
                        <button
                          type="button"
                          onClick={() => setPassbookDateFilter('')}
                          className="p-1.5 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-xl text-xs"
                          title="तारीख फिल्टर काढा"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setPassbookSortOrder(passbookSortOrder === 'DESC' ? 'ASC' : 'DESC')}
                        className="p-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs flex items-center gap-1 shrink-0"
                        title={passbookSortOrder === 'DESC' ? 'नवीनतम प्रथम (Newest First)' : 'सुरुवातीपासून (Oldest First)'}
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{passbookSortOrder === 'DESC' ? 'नवीनतम' : 'सुरुवातीपासून'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Transactions Chronological Table */}
                  {memberDailyLedger.filteredEntries.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="w-12 h-12 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        कोणत्याही नोंदी आढळल्या नाहीत
                      </h4>
                      <p className="text-xs text-slate-500">
                        निवडलेल्या फिल्टरनुसार कोणताही रोख जमा, भरणा किंवा खर्चाचा व्यवहार सापडला नाही.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] font-black">
                              <th className="py-3 px-3.5">दिनांक (Date)</th>
                              <th className="py-3 px-3">प्रकार (Type)</th>
                              <th className="py-3 px-3.5">तपशील व संदर्भ (Details & Ref)</th>
                              <th className="py-3 px-3 text-center">पुरावा (Proof)</th>
                              <th className="py-3 px-3.5 text-right">व्यवहार रक्कम (Amount)</th>
                              <th className="py-3 px-3.5 text-right">रनिंग शिल्लक (Running Balance)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {memberDailyLedger.filteredEntries.map((item) => (
                              <tr
                                key={item.id}
                                className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors"
                              >
                                {/* Date */}
                                <td className="py-3 px-3.5 whitespace-nowrap font-bold text-slate-700 dark:text-slate-300">
                                  {item.date}
                                </td>

                                {/* Type Badge */}
                                <td className="py-3 px-3 whitespace-nowrap">
                                  {item.type === 'OPENING' && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-md font-black text-[10px]">
                                      मागील शिल्लक
                                    </span>
                                  )}
                                  {item.type === 'INCOME' && (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-md font-black text-[10px] flex items-center gap-1 w-fit">
                                      <ArrowDownCircle className="w-3 h-3 text-emerald-600" />
                                      स्वीकारलेली रोख
                                    </span>
                                  )}
                                  {item.type === 'SETTLE' && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800 rounded-md font-black text-[10px] flex items-center gap-1 w-fit">
                                      <Landmark className="w-3 h-3 text-blue-600" />
                                      बँक भरणा
                                    </span>
                                  )}
                                  {item.type === 'DEBIT' && (
                                    <span className="px-2 py-0.5 bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-md font-black text-[10px] flex items-center gap-1 w-fit">
                                      <ReceiptIndianRupee className="w-3 h-3 text-rose-600" />
                                      रोख खर्च
                                    </span>
                                  )}
                                </td>

                                {/* Details & Ref */}
                                <td className="py-3 px-3.5">
                                  <p className="font-black text-slate-800 dark:text-slate-100 text-xs">
                                    {item.title}
                                  </p>
                                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 rounded font-mono font-bold">
                                      {item.refNo}
                                    </span>
                                    <span>• {item.category}</span>
                                    {item.extraInfo && (
                                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                        • {item.extraInfo}
                                      </span>
                                    )}
                                  </div>
                                  {item.notes && (
                                    <p className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">
                                      "{item.notes}"
                                    </p>
                                  )}
                                </td>

                                {/* Proof Photo Button */}
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  {item.proofUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewProofUrl(item.proofUrl || null)}
                                      className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-amber-100 text-slate-700 dark:text-slate-200 hover:text-amber-900 font-bold rounded-lg text-[10px] inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                      title="फोटो पुरावा पहा"
                                    >
                                      <ImageIcon className="w-3 h-3 text-amber-500" />
                                      <span>फोटो</span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 text-[10px]">-</span>
                                  )}
                                </td>

                                {/* Signed Amount */}
                                <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                  <span
                                    className={`text-sm font-black ${
                                      item.type === 'INCOME' || item.type === 'OPENING'
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-rose-600 dark:text-rose-400'
                                    }`}
                                  >
                                    {item.type === 'INCOME' || item.type === 'OPENING' ? '+' : '-'} ₹
                                    {item.amount.toLocaleString('en-IN')}
                                  </span>
                                  {item.type === 'SETTLE' && item.status === 'प्रलंबित' && (
                                    <p className="text-[9px] text-amber-500 font-bold">प्रलंबित</p>
                                  )}
                                </td>

                                {/* Running Balance */}
                                <td className="py-3 px-3.5 text-right whitespace-nowrap font-black text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/50">
                                  ₹{item.runningBalance.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                वर्तमान शिल्लक रोख रक्कम: <strong className="text-emerald-600 dark:text-emerald-400 text-sm">₹{memberDailyLedger.stats.netInHand.toLocaleString('en-IN')}</strong>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const mId = dailyPassbookMember.id;
                    setDailyPassbookMember(null);
                    handleOpenAddSettlement(mId);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>बँक भरणा नोंद</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const mId = dailyPassbookMember.id;
                    setDailyPassbookMember(null);
                    handleOpenAddDebit(mId);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                >
                  <ReceiptIndianRupee className="w-3.5 h-3.5" />
                  <span>रोखीतून खर्च (Debit)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDailyPassbookMember(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
                >
                  बंद करा
                </button>
              </div>
            </div>
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
