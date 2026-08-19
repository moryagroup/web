import React, { useState, useMemo } from 'react';
import {
  Member,
  IncomeTransaction,
  ExpenseTransaction,
  CurrentUser,
  CashSettlement,
  CashSettlementDestination,
  UserDesignation,
} from '../types';
import {
  getMemberSubscriptionPaid,
  getMemberExtraDonationPaid,
  isIncomeLinkedToMember,
} from '../services/storageService';
import { hasAdminPermissions, getDesignationRank, isBadgedMember } from '../utils/rbac';
import { isDateInSelectedYear, generateNextCashSettlementNo, getFinancialYearFromDate } from '../utils/dateUtils';
import { ProfilePhotoLightboxModal } from './ProfilePhotoLightboxModal';
import { ProofLightboxModal } from './ProofLightboxModal';
import { uploadFileToGoogleDrive } from '../services/googleDriveService';
import {
  Users,
  PlusCircle,
  Info,
  Search,
  Award,
  Edit2,
  Trash2,
  ShieldCheck,
  UserPlus,
  Lock,
  Key,
  Mail,
  Send,
  Copy,
  Check,
  Share2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Calendar,
  User,
  Wallet,
  Landmark,
  ArrowDownCircle,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  FileText,
  Image as ImageIcon,
  Clock,
  X,
  ReceiptIndianRupee,
} from 'lucide-react';

interface MemberSubscriptionsViewProps {
  members: Member[];
  incomes: IncomeTransaction[];
  expenses?: ExpenseTransaction[];
  cashSettlements?: CashSettlement[];
  financialYear?: string;
  currentUser: CurrentUser;
  onAddMember: (newMember: Member) => void;
  onUpdateMember: (updatedMember: Member) => void;
  onDeleteMember: (memberId: string) => void;
  onAddCashSettlement?: (newSettlement: CashSettlement) => void;
  onApproveCashSettlement?: (settlementId: string, approverName: string, approverRole: UserDesignation) => void;
  onRejectCashSettlement?: (settlementId: string, rejecterName: string, rejecterRole: UserDesignation) => void;
  onDeleteCashSettlement?: (settlementId: string) => void;
  onNavigate?: (tab: string) => void;
  onOpenLogin?: (memberId?: string, type?: 'admin' | 'member') => void;
}

const STANDARD_DESIGNATIONS = [
  'अध्यक्ष',
  'उपाध्यक्ष',
  'कार्याध्यक्ष',
  'सचिव',
  'उपसचिव',
  'खजिनदार',
  'उपखजिनदार',
  'संघटक',
  'सहसंघटक',
  'सल्लागार',
  'कार्या सल्लागार',
  'सभासद',
];

export const MemberSubscriptionsView: React.FC<MemberSubscriptionsViewProps> = ({
  members,
  incomes,
  expenses = [],
  cashSettlements = [],
  financialYear,
  currentUser,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onAddCashSettlement,
  onApproveCashSettlement,
  onRejectCashSettlement,
  onDeleteCashSettlement,
  onNavigate,
  onOpenLogin,
}) => {
  const isLoggedIn = currentUser.isLoggedIn !== false;
  const isStrictAdmin = isLoggedIn && (currentUser.role === 'ॲडमिन' || currentUser.role === 'Admin');
  const isAdmin = isStrictAdmin;
  const isBadged = isBadgedMember(currentUser.role) && isLoggedIn;

  // Selected Year state (Default 2026 or passed financialYear)
  const [selectedYear, setSelectedYear] = useState<string>(financialYear || '२०२६');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter incomes by selected year for member subscription calculations
  const filteredIncomesByYear = useMemo(() => {
    if (selectedYear === 'ALL') return incomes;
    return incomes.filter((i) => isDateInSelectedYear(i.transactionDate, selectedYear, i.financialYear));
  }, [incomes, selectedYear]);

  if (!isLoggedIn || !isBadged) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl max-w-xl mx-auto text-center space-y-5 my-8">
        <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-800">
            सभासद वर्गणी हिशोब केवळ पदाधिकाऱ्यांसाठी उपलब्ध
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            सर्व सभासदांची वर्गणी टार्गेट, जमा हिशोब व संपर्क यादी पाहण्याचा अधिकार केवळ कार्यकारिणी पदाधिकारी (Badged Members) व ॲडमिन यांनाच आहे.
          </p>
        </div>
        <button
          onClick={() => onOpenLogin && onOpenLogin(undefined, 'admin')}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl shadow-lg inline-flex items-center gap-2 cursor-pointer transition-all"
        >
          <Lock className="w-4 h-4" />
          <span>पदाधिकारी / ॲडमिन म्हणून लॉगिन करा</span>
        </button>
      </div>
    );
  }

  // Photo Lightbox state
  const [photoModalMember, setPhotoModalMember] = useState<Member | null>(null);

  // Member Receipts & Deposit History Modal state
  const [selectedMemberForReceipts, setSelectedMemberForReceipts] = useState<Member | null>(null);

  // Add Member Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFullName, setAddFullName] = useState('');
  const [addDesignation, setAddDesignation] = useState('सभासद');
  const [addCustomDesignation, setAddCustomDesignation] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addAddress, setAddAddress] = useState('हडपसर गोंधळनगर, पुणे');
  const [addAnnualTarget, setAddAnnualTarget] = useState('6000');
  const [addBirthDate, setAddBirthDate] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addAge, setAddAge] = useState('');
  const [addPassword, setAddPassword] = useState('morya@123');
  const [addConfirmPassword, setAddConfirmPassword] = useState('morya@123');
  const [addPasswordError, setAddPasswordError] = useState<string | null>(null);

  // Edit Member Modal state
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editDesignation, setEditDesignation] = useState('सभासद');
  const [editCustomDesignation, setEditCustomDesignation] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAnnualTarget, setEditAnnualTarget] = useState('6000');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [editPasswordError, setEditPasswordError] = useState<string | null>(null);

  // Password & Email Reset Share Link Modal
  const [shareModalMember, setShareModalMember] = useState<Member | null>(null);
  const [sharePasswordVal, setSharePasswordVal] = useState('');
  const [shareConfirmPasswordVal, setShareConfirmPasswordVal] = useState('');
  const [sharePasswordError, setSharePasswordError] = useState<string | null>(null);
  const [shareEmailVal, setShareEmailVal] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [shareSentNotice, setShareSentNotice] = useState(false);

  // Cash Settlement Modal & State
  const [showCashSettlementModal, setShowCashSettlementModal] = useState(false);
  const [settleMemberId, setSettleMemberId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDestination, setSettleDestination] = useState<CashSettlementDestination>('ट्रस्ट बँक खाते');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [settleBankRefNo, setSettleBankRefNo] = useState('');
  const [settleSlipPhotoUrl, setSettleSlipPhotoUrl] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settleSuccessMsg, setSettleSuccessMsg] = useState<string | null>(null);
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

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

  // Compute Member Cash Received, Approved Deposited to Trust/Bank, and Net Cash in Hand
  const memberCashStats = useMemo(() => {
    const settlementsList = cashSettlements || [];
    const yearSettlements =
      selectedYear === 'ALL'
        ? settlementsList
        : settlementsList.filter((s) =>
            isDateInSelectedYear(s.depositDate, selectedYear, s.financialYear)
          );

    let totalCashReceivedAll = 0;
    let totalCashSettledAll = 0;
    let totalNetCashAll = 0;

    const memberMap: Record<
      string,
      {
        member: Member;
        cashReceived: number;
        cashSettled: number;
        netCashInHand: number;
        pendingSettlement: number;
        pendingCount: number;
      }
    > = {};

    const filteredExpenses = (expenses || []).filter((e) =>
      selectedYear === 'ALL'
        ? true
        : isDateInSelectedYear(e.expenseDate, selectedYear, e.financialYear)
    );

    members.forEach((m) => {
      const received = filteredIncomesByYear
        .filter((i) => i.paymentMethod === 'रोख' && (i.cashReceiverMemberId === m.id || (i.cashReceiverName && i.cashReceiverName.trim().toLowerCase() === m.fullName.trim().toLowerCase())))
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

      const approvedSettled = yearSettlements
        .filter((s) => s.memberId === m.id && s.approvalStatus === 'मंजूर')
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

      const debited = filteredExpenses
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

      const netInHand = Math.max(0, received - approvedSettled - debited);

      memberMap[m.id] = {
        member: m,
        cashReceived: received,
        cashSettled: approvedSettled,
        netCashInHand: netInHand,
        pendingSettlement: pendingSettled,
        pendingCount,
      };

      totalCashReceivedAll += received;
      totalCashSettledAll += approvedSettled;
      totalNetCashAll += netInHand;
    });

    // All pending approvals must always be visible regardless of year filter
    const pendingApprovalsList = settlementsList.filter((s) => s.approvalStatus === 'प्रलंबित');

    const activeCashMembers = Object.values(memberMap)
      .filter((item) => item.cashReceived > 0 || item.cashSettled > 0 || item.netCashInHand > 0)
      .sort((a, b) => b.netCashInHand - a.netCashInHand);

    return {
      memberMap,
      activeCashMembers,
      totalCashReceivedAll,
      totalCashSettledAll,
      totalNetCashAll,
      pendingApprovalsList,
    };
  }, [members, filteredIncomesByYear, cashSettlements, selectedYear]);

  // Open Settlement Modal
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
    setShowCashSettlementModal(true);
  };

  // Submit Settlement Entry
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

    onAddCashSettlement?.(newSettlement);
    setSettleSuccessMsg(
      'रोख भरणा नोंद सबमिट झाली! खजिनदार किंवा उपखजिनदार यांच्या मंजुरीनंतर ही रक्कम शिल्लक रोखीतून वजा होईल.'
    );
    setTimeout(() => {
      setShowCashSettlementModal(false);
      setSettleSuccessMsg(null);
    }, 1800);
  };

  // Handle Bank Slip upload to Google Drive
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

  // Delete Confirm Modal state
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Helper to handle Add Birth Date change and calc age
  const handleAddBirthDateChange = (val: string) => {
    setAddBirthDate(val);
    if (val) {
      const birth = new Date(val);
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let calcAge = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) calcAge--;
        if (calcAge >= 0) setAddAge(String(calcAge));
      }
    }
  };

  // Helper to handle Edit Birth Date change and calc age
  const handleEditBirthDateChange = (val: string) => {
    setEditBirthDate(val);
    if (val) {
      const birth = new Date(val);
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let calcAge = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) calcAge--;
        if (calcAge >= 0) setEditAge(String(calcAge));
      }
    }
  };

  // Handle Add Member Submit
  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    setAddPasswordError(null);
    if (!addFullName.trim()) return;

    if (addPassword.trim() || addConfirmPassword.trim()) {
      if (addPassword.trim() !== addConfirmPassword.trim()) {
        setAddPasswordError('पासवर्ड जुळत नाहीत! कृपया दोन्ही पासवर्ड सारखे प्रविष्ट करा.');
        return;
      }
    }

    const finalDesignation =
      addDesignation === 'इतर'
        ? addCustomDesignation.trim() || 'सभासद'
        : addDesignation;

    const nextCodeNumber = members.length + 101;
    const nextCode = `M-${nextCodeNumber}`;

    const newMember: Member = {
      id: `m-${Date.now()}`,
      memberCode: nextCode,
      fullName: addFullName.trim(),
      designation: finalDesignation,
      phone: addPhone.trim() || '९८२२०१०१००',
      annualTargetAmount: parseFloat(addAnnualTarget) || 6000,
      address: addAddress.trim() || undefined,
      isActive: true,
      birthDate: addBirthDate || undefined,
      email: addEmail.trim() || undefined,
      age: parseInt(addAge, 10) || undefined,
      password: addPassword.trim() || 'morya@123',
    };

    onAddMember(newMember);

    // Reset Form
    setAddFullName('');
    setAddDesignation('सभासद');
    setAddCustomDesignation('');
    setAddPhone('');
    setAddAddress('हडपसर गोंधळनगर, पुणे');
    setAddAnnualTarget('6000');
    setAddBirthDate('');
    setAddEmail('');
    setAddAge('');
    setAddPassword('morya@123');
    setAddConfirmPassword('morya@123');
    setAddPasswordError(null);
    setShowAddModal(false);
  };

  // Open Edit Modal
  const handleOpenEditModal = (member: Member) => {
    setEditingMember(member);
    setEditFullName(member.fullName);

    if (STANDARD_DESIGNATIONS.includes(member.designation || 'सभासद')) {
      setEditDesignation(member.designation || 'सभासद');
      setEditCustomDesignation('');
    } else {
      setEditDesignation('इतर');
      setEditCustomDesignation(member.designation || '');
    }

    setEditPhone(member.phone || '');
    setEditAddress(member.address || 'हडपसर गोंधळनगर, पुणे');
    setEditAnnualTarget(String(member.annualTargetAmount || 6000));
    setEditBirthDate(member.birthDate || '');
    setEditEmail(member.email || '');
    setEditAge(member.age ? String(member.age) : '');
    setEditPassword(member.password || '');
    setEditConfirmPassword(member.password || '');
    setEditPasswordError(null);
  };

  // Handle Edit Member Submit
  const handleUpdateMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditPasswordError(null);
    if (!editingMember || !editFullName.trim()) return;

    if (editPassword.trim() || editConfirmPassword.trim()) {
      if (editPassword.trim() !== editConfirmPassword.trim()) {
        setEditPasswordError('पासवर्ड जुळत नाहीत! कृपया दोन्ही पासवर्ड सारखे प्रविष्ट करा.');
        return;
      }
    }

    const finalDesignation =
      editDesignation === 'इतर'
        ? editCustomDesignation.trim() || 'सभासद'
        : editDesignation;

    const updatedMember: Member = {
      ...editingMember,
      fullName: editFullName.trim(),
      designation: finalDesignation,
      phone: editPhone.trim(),
      address: editAddress.trim(),
      annualTargetAmount: parseFloat(editAnnualTarget) || 6000,
      birthDate: editBirthDate || undefined,
      email: editEmail.trim() || undefined,
      age: parseInt(editAge, 10) || undefined,
      password: editPassword.trim() || undefined,
    };

    onUpdateMember(updatedMember);
    setEditingMember(null);
  };

  // Open Password & Email Share Link Modal
  const handleOpenShareModal = (member: Member) => {
    setShareModalMember(member);
    const pass = member.password && member.password.trim() !== '' ? member.password.trim() : 'morya@123';
    setSharePasswordVal(pass);
    setShareConfirmPasswordVal(pass);
    setSharePasswordError(null);
    setShareEmailVal(member.email || 'moryagroupdata@gmail.com');
    setShareCopied(false);
    setShareSentNotice(false);
  };

  const handleSaveSharePassword = () => {
    setSharePasswordError(null);
    if (shareModalMember) {
      if (sharePasswordVal.trim() || shareConfirmPasswordVal.trim()) {
        if (sharePasswordVal.trim() !== shareConfirmPasswordVal.trim()) {
          setSharePasswordError('पासवर्ड जुळत नाहीत! दोन्ही पासवर्ड समान असावेत.');
          return;
        }
      }

      const updated: Member = {
        ...shareModalMember,
        password: sharePasswordVal.trim() || undefined,
        email: shareEmailVal.trim() || shareModalMember.email,
      };
      onUpdateMember(updated);
      setShareSentNotice(true);
      setTimeout(() => setShareSentNotice(false), 3000);
    }
  };

  const shareResetLink = shareModalMember
    ? `${window.location.origin}/#reset-password?memberId=${shareModalMember.memberCode}&token=${Date.now()}`
    : '';

  const handleSendMailLink = () => {
    if (!shareModalMember) return;
    const subject = encodeURIComponent('मोरया ग्रुप मित्र मंडळ - पासवर्ड व खाते माहिती');
    const body = encodeURIComponent(
      `नमस्कार ${shareModalMember.fullName},\n\nमोरया ग्रुप मित्र मंडळ डिजिटल प्रणालीमध्ये तुमचा खात्याचा पासवर्ड: ${
        sharePasswordVal || '(अजून सेट केलेला नाही)'
      }\n\nपासवर्ड बदलण्यासाठी किंवा लॉग इन करण्यासाठी खालील रिसेट लिंकवर क्लिक करा:\n${shareResetLink}\n\nधन्यवाद,\nमोरया ग्रुप मित्र मंडळ (ट्रस्ट)\nहडपसर गोंधळनगर, पुणे`
    );
    window.open(`mailto:${shareEmailVal}?subject=${subject}&body=${body}`, '_blank');
    setShareSentNotice(true);
    setTimeout(() => setShareSentNotice(false), 3000);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareResetLink);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  // Handle Delete Confirm
  const handleConfirmDelete = () => {
    if (!memberToDelete) return;
    onDeleteMember(memberToDelete.id);
    setMemberToDelete(null);
  };

  // Sort members strictly in requested order:
  // अध्यक्ष → कार्याध्यक्ष → उपाध्यक्ष → सचिव → खजिनदार → उपخजिनदार → सभासद
  const sortedAndFilteredMembers = useMemo(() => {
    return [...members]
      .filter((m) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          m.fullName.toLowerCase().includes(q) ||
          m.memberCode.toLowerCase().includes(q) ||
          (m.designation && m.designation.toLowerCase().includes(q)) ||
          m.phone.includes(q)
        );
      })
      .sort((a, b) => {
        const rankA = getDesignationRank(a.designation);
        const rankB = getDesignationRank(b.designation);
        if (rankA !== rankB) return rankA - rankB;
        return a.memberCode.localeCompare(b.memberCode, undefined, { numeric: true });
      });
  }, [members, searchQuery]);

  // Compute Overall Membership Target, Collection and Pending Stats
  const overallStats = useMemo(() => {
    let totalTarget = 0;
    let totalSubscriptionCollected = 0;
    let totalDonationCollected = 0;
    let completedMembersCount = 0;

    members.forEach((m) => {
      const target = m.annualTargetAmount || 6000;
      totalTarget += target;
      const sub = getMemberSubscriptionPaid(m.id, filteredIncomesByYear, undefined, m.fullName);
      const don = getMemberExtraDonationPaid(m.id, filteredIncomesByYear, undefined, m.fullName);
      totalSubscriptionCollected += sub;
      totalDonationCollected += don;
      if (sub >= target) {
        completedMembersCount++;
      }
    });

    const totalRemaining = Math.max(0, totalTarget - totalSubscriptionCollected);

    return {
      totalTarget,
      totalSubscriptionCollected,
      totalRemaining,
      totalDonationCollected,
      completedMembersCount,
      totalMembers: members.length,
    };
  }, [members, filteredIncomesByYear]);

  return (
    <div className="space-y-6 my-4">
      {/* Top Banner & Control Bar */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border border-slate-700 font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1"
              title="मुख्य डॅशबोर्डवर परत जा (Exit)"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">← मुख्य पान</span>
            </button>
          )}
          <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center font-bold">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">सभासद व पदाधिकारी यादी (हिशोब)</h2>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-xs font-black">
                एकूण {members.length}
              </span>
              {isAdmin && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-300 rounded-md text-[10px] font-black flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-600" />
                  ॲडमिन मोड
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              पदाधिकारी व सर्व सभासदांची नाव, पदवी, वार्षिक निर्धारित वर्गणी (₹६,०००) व जमा हिशोब.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {/* Year selector for checking previous year data */}
          <div className="flex items-center gap-1.5 bg-amber-50/90 border border-amber-300 p-1.5 px-3 rounded-xl shrink-0">
            <Calendar className="w-4 h-4 text-amber-700" />
            <span className="text-xs font-bold text-amber-900 hidden sm:inline">वर्ष (Year):</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white dark:bg-slate-700 border border-amber-300 dark:border-amber-600 font-black text-amber-950 dark:text-amber-300 text-xs rounded-lg px-2 py-1 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
            >
              <option value="२०२६">२०२६</option>
              <option value="२०२७">२०२७</option>
              <option value="२०२५">२०२५</option>
              <option value="२०२४">२०२४</option>
              <option value="ALL">सर्व वर्षे</option>
            </select>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="सभासद / पद शोधा (उदा. अध्यक्ष, महेश)..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none bg-slate-50/50 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400"
            />
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 cursor-pointer shrink-0 transition-all"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>+ नवीन सभासद जोडा</span>
            </button>
          )}
        </div>
      </div>

      {/* Overall Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">एकूण वर्गणी उद्दिष्ट</p>
          <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1">
            ₹{overallStats.totalTarget.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {overallStats.totalMembers} सभासद (₹६,००० प्रति)
          </p>
        </div>

        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400">एकूण जमा झालेली वर्गणी</p>
          <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-1">
            ₹{overallStats.totalSubscriptionCollected.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-500 mt-0.5">
            {overallStats.completedMembersCount} सभासदांची पूर्ण
          </p>
        </div>

        <div className="bg-rose-50/70 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-200 dark:border-rose-800 shadow-2xs">
          <p className="text-[11px] font-bold text-rose-800 dark:text-rose-400">एकूण येणे बाकी वर्गणी</p>
          <p className="text-lg font-black text-rose-700 dark:text-rose-300 mt-1">
            ₹{overallStats.totalRemaining.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-rose-600/80 dark:text-rose-500 mt-0.5">
            उर्वरित बाकी रक्कम
          </p>
        </div>

        <div className="bg-amber-50/70 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-2xs">
          <p className="text-[11px] font-bold text-amber-800 dark:text-amber-400">सभासद अतिरिक्त देणगी</p>
          <p className="text-lg font-black text-amber-700 dark:text-amber-300 mt-1">
            ₹{overallStats.totalDonationCollected.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-amber-600/80 dark:text-amber-500 mt-0.5">
            विशेष देणगी / प्रायोजकत्व
          </p>
        </div>

        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-2xs col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold text-indigo-800 dark:text-indigo-400">सभासदांकडे शिल्लक रोख</p>
          <p className="text-lg font-black text-indigo-700 dark:text-indigo-300 mt-1">
            ₹{memberCashStats.totalNetCashAll.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-indigo-600/80 dark:text-indigo-500 mt-0.5">
            रोख संकलन - बँक भरणा
          </p>
        </div>
      </div>

      {/* Members Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedAndFilteredMembers.map((member) => {
          const subscriptionPaid = getMemberSubscriptionPaid(member.id, filteredIncomesByYear, undefined, member.fullName);
          const extraDonationPaid = getMemberExtraDonationPaid(member.id, filteredIncomesByYear, undefined, member.fullName);
          const memberIncomes = filteredIncomesByYear.filter((i) =>
            isIncomeLinkedToMember(i, member.id, member.fullName)
          );
          const target = member.annualTargetAmount || 6000;
          const remainingSubscription = Math.max(0, target - subscriptionPaid);
          const percentage = Math.min(100, Math.round((subscriptionPaid / target) * 100));
          const memberCash = memberCashStats.memberMap[member.id];

          const isOfficeBearer = member.designation && member.designation !== 'सभासद';

          return (
            <div
              key={member.id}
              className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all ${
                isOfficeBearer
                  ? 'border-amber-300 dark:border-amber-600 ring-1 ring-amber-400/20'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex items-start gap-3">
                    {/* Clickable Profile Photo Thumbnail */}
                    <div
                      onClick={() => setPhotoModalMember(member)}
                      className="w-12 h-12 rounded-full border-2 border-amber-400 p-0.5 bg-slate-900 shadow-md cursor-pointer hover:scale-105 transition-transform shrink-0 relative group flex items-center justify-center"
                      title="मोठा प्रोफाईल फोटो पहा (Click for Full Screen Photo View)"
                    >
                      {member.photoUrl ? (
                        <img
                          src={member.photoUrl}
                          alt={member.fullName}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 font-bold text-xs">
                          {member.fullName.slice(0, 2)}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono font-bold text-[10px] rounded border border-slate-200 dark:border-slate-600">
                          {member.memberCode}
                        </span>
                        {isOfficeBearer ? (
                          <span className="px-2.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[11px] rounded-md shadow-xs flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {member.designation}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-md border border-slate-200 dark:border-slate-600">
                            {member.designation || 'सभासद'}
                          </span>
                        )}
                      </div>

                      <h3
                        onClick={() => setPhotoModalMember(member)}
                        className="text-base font-black text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-1.5 cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        title="मोठा प्रोफाईल फोटो पहा"
                      >
                        {member.fullName}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">मो: {member.phone}</p>
                      {member.address && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{member.address}</p>
                      )}
                    </div>
                  </div>

                  {member.id === 'm-admin' || member.designation === 'ॲडमिन' ? (
                    <span className="px-2.5 py-1 text-[11px] font-black rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 shrink-0">
                      ⚡ ॲडमिन खाते
                    </span>
                  ) : (
                    <span
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-full shrink-0 ${
                        subscriptionPaid >= target
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                      }`}
                    >
                      {subscriptionPaid >= target ? 'वर्गणी पूर्ण' : 'अपूर्ण'}
                    </span>
                  )}
                </div>

                {/* Subscription Progress Bar (Hidden for System Admin) */}
                {member.id !== 'm-admin' && member.designation !== 'ॲडमिन' && (
                  <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-600 dark:text-slate-300">वार्षिक वर्गणी प्रगती:</span>
                      <span className="text-blue-700">
                        ₹{subscriptionPaid.toLocaleString('en-IN')} / ₹{target.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          subscriptionPaid >= target ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-right text-slate-400 dark:text-slate-500">
                      {percentage}% पूर्ण | बाकी: ₹{remainingSubscription.toLocaleString('en-IN')}
                    </p>
                  </div>
                )}

                {/* Extra Donation Indicator */}
                {extraDonationPaid > 0 && (
                  <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-100 dark:border-emerald-800 flex justify-between items-center text-xs">
                    <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
                      अतिरिक्त देणगी (Donation):
                    </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      + ₹{extraDonationPaid.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {/* Member Cash in Hand Indicator */}
                {memberCash && (memberCash.cashReceived > 0 || memberCash.netCashInHand > 0) && (
                  <div className="mt-3 p-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-900 dark:text-emerald-300">
                        <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>शिल्लक रोख (Cash in Hand):</span>
                        <strong className="text-emerald-700 dark:text-emerald-300 font-black">
                          ₹{memberCash.netCashInHand.toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                        जमा: ₹{memberCash.cashReceived.toLocaleString('en-IN')} | भरणा: ₹{memberCash.cashSettled.toLocaleString('en-IN')}
                      </p>
                    </div>
                    {memberCash.netCashInHand > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddSettlement(member.id)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] shadow-xs cursor-pointer shrink-0 transition-all active:scale-95"
                      >
                        ➕ भरणा
                      </button>
                    )}
                  </div>
                )}

                {/* Member Deposits & Receipts Button */}
                <button
                  type="button"
                  onClick={() => setSelectedMemberForReceipts(member)}
                  className="w-full mt-3 py-2 px-3 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-700/60 font-bold text-xs flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                  title="या सभासदाच्या सर्व जमा पावत्या व तपशील पहा"
                >
                  <div className="flex items-center gap-1.5">
                    <ReceiptIndianRupee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>जमा पावत्या व तपशील</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-200/80 dark:bg-amber-800 text-amber-950 dark:text-amber-100 rounded-md font-mono text-[10px] font-black">
                    {memberIncomes.length} {memberIncomes.length === 1 ? 'पावती' : 'पावत्या'}
                  </span>
                </button>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block">एकूण जमा जमाव:</span>
                  <span className="font-black text-slate-800 dark:text-slate-100 text-xs">
                    ₹{(subscriptionPaid + extraDonationPaid).toLocaleString('en-IN')}
                  </span>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenShareModal(member)}
                      className="px-2 py-1 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 font-bold text-[11px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-amber-200 dark:border-amber-700"
                      title="पासवर्ड व्यवस्थापन व इमेल लिंक"
                    >
                      <Key className="w-3 h-3 text-amber-600" />
                      <span>{member.password ? '🔑 पासवर्ड' : '➕ पासवर्ड'}</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(member)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[11px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      title="माहिती संपादन / पद बदला"
                    >
                      <Edit2 className="w-3 h-3 text-blue-600" />
                      <span>संपादित करा</span>
                    </button>
                    <button
                      onClick={() => setMemberToDelete(member)}
                      className="p-1.5 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="सभासद काढा"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600" />
                नवीन सभासद / पदाधिकारी जोडा
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">
                  सभासदाचे नाव (मराठीत) *
                </label>
                <input
                  type="text"
                  required
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  placeholder="उदा. महेश शिंदे"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">
                  पद (Designation) *
                </label>
                <select
                  value={addDesignation}
                  onChange={(e) => setAddDesignation(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="सभासद">सभासद</option>
                  <option value="अध्यक्ष">अध्यक्ष</option>
                  <option value="उपाध्यक्ष">उपाध्यक्ष</option>
                  <option value="कार्याध्यक्ष">कार्याध्यक्ष</option>
                  <option value="सचिव">सचिव</option>
                  <option value="उपसचिव">उपसचिव</option>
                  <option value="खजिनदार">खजिनदार</option>
                  <option value="उपखजिनदार">उपखजिनदार</option>
                  <option value="संघटक">संघटक</option>
                  <option value="सहसंघटक">सहसंघटक</option>
                  <option value="सल्लागार">सल्लागार</option>
                  <option value="कार्या सल्लागार">कार्या सल्लागार</option>
                  <option value="इतर">इतर (कस्टम पद जोडा)</option>
                </select>
              </div>

              {addDesignation === 'इतर' && (
                <div>
                  <label className="block font-bold text-amber-800 uppercase mb-1">
                    कस्टम पद लिहा *
                  </label>
                  <input
                    type="text"
                    required
                    value={addCustomDesignation}
                    onChange={(e) => setAddCustomDesignation(e.target.value)}
                    placeholder="उदा. सल्लागार, मीडिया प्रमुख..."
                    className="w-full p-2.5 border border-amber-300 bg-amber-50/50 rounded-lg font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">
                  मोबाइल क्रमांक (Mobile No)
                </label>
                <input
                  type="text"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  placeholder="उदा. ९८२२०१०१०१"
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">
                    जन्मतारीख (Birth Date)
                  </label>
                  <input
                    type="date"
                    value={addBirthDate}
                    onChange={(e) => handleAddBirthDateChange(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">
                    वय (Age)
                  </label>
                  <input
                    type="number"
                    value={addAge}
                    onChange={(e) => setAddAge(e.target.value)}
                    placeholder="उदा. ३४"
                    className="w-full p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">
                  ई-मेल आयडी (Mail ID)
                </label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="example@moryagroup.org"
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-900 uppercase mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  खात्याचा पासवर्ड / PIN (खाते लॉगिनसाठी)
                </label>
                <input
                  type="password"
                  value={addPassword}
                  onChange={(e) => {
                    setAddPassword(e.target.value);
                    setAddPasswordError(null);
                  }}
                  placeholder="नवीन पासवर्ड प्रविष्ट करा (उदा. Morya@123)"
                  className="w-full p-2.5 border border-amber-300 bg-amber-50/30 rounded-lg font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-900 uppercase mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  पासवर्ड पुन्हा टाका (Re-enter Password)
                </label>
                <input
                  type="password"
                  value={addConfirmPassword}
                  onChange={(e) => {
                    setAddConfirmPassword(e.target.value);
                    setAddPasswordError(null);
                  }}
                  placeholder="पासवर्ड पुन्हा टाइप करा"
                  className="w-full p-2.5 border border-amber-300 bg-amber-50/30 rounded-lg font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {addPasswordError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{addPasswordError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">
                  वार्षिक वर्गणी टार्गेट (₹)
                </label>
                <input
                  type="number"
                  value={addAnnualTarget}
                  onChange={(e) => setAddAnnualTarget(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">पत्ता</label>
                <input
                  type="text"
                  value={addAddress}
                  onChange={(e) => setAddAddress(e.target.value)}
                  placeholder="हडपसर गोंधळनगर, पुणे"
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg cursor-pointer"
                >
                  सभासद जोडा
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                सभासद माहिती संपादित करा / पद बदला
              </h3>
              <button
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateMemberSubmit} className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono font-bold flex justify-between">
                <span>सदस्य कोड:</span>
                <span className="text-slate-900">{editingMember.memberCode}</span>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">
                  पूर्ण नाव (मराठीत) *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">
                  पद नियुक्ती (Designation) *
                </label>
                <select
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="सभासद">सभासद</option>
                  <option value="अध्यक्ष">अध्यक्ष</option>
                  <option value="उपाध्यक्ष">उपाध्यक्ष</option>
                  <option value="कार्याध्यक्ष">कार्याध्यक्ष</option>
                  <option value="सचिव">सचिव</option>
                  <option value="उपसचिव">उपसचिव</option>
                  <option value="खजिनदार">खजिनदार</option>
                  <option value="उपखजिनदार">उपखजिनदार</option>
                  <option value="संघटक">संघटक</option>
                  <option value="सहसंघटक">सहसंघटक</option>
                  <option value="सल्लागार">सल्लागार</option>
                  <option value="कार्या सल्लागार">कार्या सल्लागार</option>
                  <option value="इतर">इतर (कस्टम पद)</option>
                </select>
              </div>

              {editDesignation === 'इतर' && (
                <div>
                  <label className="block font-bold text-amber-800 uppercase mb-1">
                    कस्टम पद लिहा *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCustomDesignation}
                    onChange={(e) => setEditCustomDesignation(e.target.value)}
                    className="w-full p-2.5 border border-amber-300 bg-amber-50/50 rounded-lg font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">
                  मोबाइल क्रमांक (Mobile No)
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">
                    जन्मतारीख (Birth Date)
                  </label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => handleEditBirthDateChange(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">
                    वय (Age)
                  </label>
                  <input
                    type="number"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    placeholder="उदा. ३४"
                    className="w-full p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">
                  ई-मेल आयडी (Mail ID)
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="example@moryagroup.org"
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-900 uppercase mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  खात्याचा पासवर्ड / PIN (पासवर्ड बदलावा असल्यास)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => {
                    setEditPassword(e.target.value);
                    setEditPasswordError(null);
                  }}
                  placeholder="नवीन पासवर्ड प्रविष्ट करा"
                  className="w-full p-2.5 border border-amber-300 bg-amber-50/30 rounded-lg font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-900 uppercase mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  पासवर्ड पुन्हा टाका (Re-enter Password)
                </label>
                <input
                  type="password"
                  value={editConfirmPassword}
                  onChange={(e) => {
                    setEditConfirmPassword(e.target.value);
                    setEditPasswordError(null);
                  }}
                  placeholder="पासवर्ड पुन्हा टाइप करा"
                  className="w-full p-2.5 border border-amber-300 bg-amber-50/30 rounded-lg font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {editPasswordError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editPasswordError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">
                  वार्षिक वर्गणी टार्गेट (₹)
                </label>
                <input
                  type="number"
                  value={editAnnualTarget}
                  onChange={(e) => setEditAnnualTarget(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">पत्ता</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  माहिती सेव्ह करा
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password & Share Email Link Modal */}
      {shareModalMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                पासवर्ड व्यवस्थापन व इमेल लिंक
              </h3>
              <button
                onClick={() => setShareModalMember(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex justify-between items-center">
                <div>
                  <p className="font-bold">{shareModalMember.fullName}</p>
                  <p className="text-[11px] text-amber-700">पद: {shareModalMember.designation} | कोड: {shareModalMember.memberCode}</p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  नवीन पासवर्ड:
                </label>
                <input
                  type="password"
                  value={sharePasswordVal}
                  onChange={(e) => {
                    setSharePasswordVal(e.target.value);
                    setSharePasswordError(null);
                  }}
                  placeholder="उदा. MoryaPass123"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  पासवर्ड पुन्हा टाका (Confirm Password):
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={shareConfirmPasswordVal}
                    onChange={(e) => {
                      setShareConfirmPasswordVal(e.target.value);
                      setSharePasswordError(null);
                    }}
                    placeholder="पासवर्ड पुन्हा टाइप करा"
                    className="flex-1 p-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSharePassword}
                    className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs cursor-pointer shrink-0"
                  >
                    सेव्ह करा
                  </button>
                </div>
              </div>

              {sharePasswordError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{sharePasswordError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ई-मेल आयडी (Mail ID):
                </label>
                <input
                  type="email"
                  value={shareEmailVal}
                  onChange={(e) => setShareEmailVal(e.target.value)}
                  placeholder="moryagroupdata@gmail.com"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  इमेलद्वारे पाठवली जाणारी पासवर्ड रिसेट लिंक:
                </label>
                <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 break-all">
                  {shareResetLink}
                </div>
              </div>

              {shareSentNotice && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-bold text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>पासवर्ड अपडेट केला / इमेल पाठवला आहे!</span>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={handleSendMailLink}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>इमेल वर लिंक पाठवा</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  {shareCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{shareCopied ? 'कॉपी झाली!' : 'कॉपी करा'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">सभासद काढून टाका?</h3>
              <p className="text-xs text-slate-500 mt-1">
                तुम्ही खरोखरच <strong className="text-slate-900">{memberToDelete.fullName}</strong> ({memberToDelete.designation || 'सभासद'}) यांना यादीतून काढू इच्छिता?
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                होय, काढा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Profile Photo Lightbox Modal */}
      {photoModalMember && (
        <ProfilePhotoLightboxModal
          isOpen={!!photoModalMember}
          onClose={() => setPhotoModalMember(null)}
          photoUrl={photoModalMember.photoUrl}
          memberName={photoModalMember.fullName}
          memberRole={photoModalMember.designation}
          memberCode={photoModalMember.memberCode}
        />
      )}

      {/* ─── Add Cash Settlement (Handover to Trust/Bank) Modal ─── */}
      {showCashSettlementModal && (
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
                onClick={() => setShowCashSettlementModal(false)}
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

              {/* Alert notice about Treasurer Approval */}
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
                  onClick={() => setShowCashSettlementModal(false)}
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

      {/* Member Receipts & Deposit History Modal */}
      {selectedMemberForReceipts && (() => {
        const memberIncomes = filteredIncomesByYear.filter((i) =>
          isIncomeLinkedToMember(i, selectedMemberForReceipts.id, selectedMemberForReceipts.fullName)
        );
        const subTotal = getMemberSubscriptionPaid(
          selectedMemberForReceipts.id,
          filteredIncomesByYear,
          undefined,
          selectedMemberForReceipts.fullName
        );
        const donTotal = getMemberExtraDonationPaid(
          selectedMemberForReceipts.id,
          filteredIncomesByYear,
          undefined,
          selectedMemberForReceipts.fullName
        );
        const target = selectedMemberForReceipts.annualTargetAmount || 6000;
        const remaining = Math.max(0, target - subTotal);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-amber-400 p-0.5 bg-slate-900 shadow-md shrink-0 flex items-center justify-center overflow-hidden">
                    {selectedMemberForReceipts.photoUrl ? (
                      <img
                        src={selectedMemberForReceipts.photoUrl}
                        alt={selectedMemberForReceipts.fullName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 font-bold text-xs">
                        {selectedMemberForReceipts.fullName.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold text-[10px] rounded border border-slate-200 dark:border-slate-600">
                        {selectedMemberForReceipts.memberCode}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 font-bold text-[10px] rounded-md">
                        {selectedMemberForReceipts.designation || 'सभासद'}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">
                      {selectedMemberForReceipts.fullName} - जमा पावत्या हिशोब
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      वर्ष: {selectedYear === 'ALL' ? 'सर्व वर्षे' : selectedYear} | मो: {selectedMemberForReceipts.phone}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMemberForReceipts(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress & Summary Bar inside Modal */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-400">वर्गणी टार्गेट</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                    ₹{target.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">एकूण जमा वर्गणी</p>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    ₹{subTotal.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">बाकी रक्कम</p>
                  <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                    ₹{remaining.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {donTotal > 0 && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex justify-between">
                  <span>अतिरिक्त देणगी / देणगी जमा:</span>
                  <span>+ ₹{donTotal.toLocaleString('en-IN')}</span>
                </div>
              )}

              {/* Transaction List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[50vh]">
                {memberIncomes.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <ReceiptIndianRupee className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      या सभासदाची {selectedYear === 'ALL' ? '' : selectedYear + ' वर्षातील '}कोणतीही जमा नोंद आढळली नाही.
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      नवीन जमा नोंद करण्यासाठी मुख्य मेनूमधून "नवीन जमा नोंद" पर्याय वापरा.
                    </p>
                  </div>
                ) : (
                  memberIncomes.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-3 bg-white dark:bg-slate-700/60 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-2xs space-y-2 hover:border-amber-400 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-300 rounded font-mono font-bold text-[10px]">
                              {inc.receiptNumber ? `पावती: ${inc.receiptNumber}` : inc.transactionNo}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold text-[10px] rounded">
                              {inc.incomeType}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              📅 {inc.transactionDate}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1">
                            {inc.reason || `${inc.incomeType} - जमा`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            ₹{inc.amount.toLocaleString('en-IN')}
                          </p>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded font-medium">
                            {inc.paymentMethod}
                          </span>
                        </div>
                      </div>

                      {/* Cash Receiver / Payment details */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-600/60 flex-wrap gap-2">
                        <div>
                          {inc.paymentMethod === 'रोख' && inc.cashReceiverName && (
                            <span>रोख स्वीकारणारे: <strong>{inc.cashReceiverName}</strong></span>
                          )}
                          {inc.paymentReference && inc.paymentReference !== 'नमूद नाही' && (
                            <span>संदर्भ क्र: {inc.paymentReference}</span>
                          )}
                          {inc.occasionName && (
                            <span className="ml-2">उत्सव: {inc.occasionName}</span>
                          )}
                        </div>
                        {inc.attachmentUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewProofUrl(inc.attachmentUrl || null)}
                            className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>पावती फोटो पहा</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  एकूण जमा: <strong className="text-emerald-600">₹{(subTotal + donTotal).toLocaleString('en-IN')}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedMemberForReceipts(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl shadow cursor-pointer transition-all"
                >
                  बंद करा (Close)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Proof Lightbox Modal */}
      {previewProofUrl && (
        <ProofLightboxModal
          isOpen={!!previewProofUrl}
          onClose={() => setPreviewProofUrl(null)}
          imageUrl={previewProofUrl}
          title="बँक भरणा पावती / स्लिप फोटो पुरावा"
        />
      )}
    </div>
  );
};
