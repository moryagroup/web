import React, { useState, useMemo } from 'react';
import { Member, IncomeTransaction, CurrentUser } from '../types';
import { getMemberSubscriptionPaid, getMemberExtraDonationPaid } from '../services/storageService';
import { hasAdminPermissions, getDesignationRank, isBadgedMember } from '../utils/rbac';
import { isDateInSelectedYear } from '../utils/dateUtils';
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
} from 'lucide-react';

interface MemberSubscriptionsViewProps {
  members: Member[];
  incomes: IncomeTransaction[];
  financialYear?: string;
  currentUser: CurrentUser;
  onAddMember: (newMember: Member) => void;
  onUpdateMember: (updatedMember: Member) => void;
  onDeleteMember: (memberId: string) => void;
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
  financialYear,
  currentUser,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
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
  const [addPassword, setAddPassword] = useState('');
  const [addConfirmPassword, setAddConfirmPassword] = useState('');
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
      password: addPassword.trim() || undefined,
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
    setAddPassword('');
    setAddConfirmPassword('');
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
    setSharePasswordVal(member.password || '');
    setShareConfirmPasswordVal(member.password || '');
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

  return (
    <div className="space-y-6 my-4">
      {/* Top Banner & Control Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
              <h2 className="text-xl font-bold text-slate-800">सभासद व पदाधिकारी यादी (हिशोब)</h2>
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
            <p className="text-xs text-slate-500 mt-0.5">
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
              className="bg-white border border-amber-300 font-black text-amber-950 text-xs rounded-lg px-2 py-1 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
            >
              <option value="२०२६">२०२६ (चालू वर्ष)</option>
              <option value="२०२५">२०२५ (मागील वर्ष)</option>
              <option value="२०२४">२०२४ (मागील वर्ष)</option>
              <option value="२०२७">२०२७ (पुढील वर्ष)</option>
              <option value="ALL">सर्व वर्षे (All Years)</option>
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
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none bg-slate-50/50"
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



      {/* Members Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedAndFilteredMembers.map((member) => {
          const subscriptionPaid = getMemberSubscriptionPaid(member.id, filteredIncomesByYear);
          const extraDonationPaid = getMemberExtraDonationPaid(member.id, filteredIncomesByYear);
          const target = member.annualTargetAmount || 6000;
          const remainingSubscription = Math.max(0, target - subscriptionPaid);
          const percentage = Math.min(100, Math.round((subscriptionPaid / target) * 100));

          const isOfficeBearer = member.designation && member.designation !== 'सभासद';

          return (
            <div
              key={member.id}
              className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all ${
                isOfficeBearer
                  ? 'border-amber-300 ring-1 ring-amber-400/20 bg-amber-50/20'
                  : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono font-bold text-[10px] rounded border border-slate-200">
                        {member.memberCode}
                      </span>
                      {isOfficeBearer ? (
                        <span className="px-2.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[11px] rounded-md shadow-xs flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {member.designation}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md border border-slate-200">
                          {member.designation || 'सभासद'}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-black text-slate-800 mt-1.5 flex items-center gap-1.5">
                      {member.fullName}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">मो: {member.phone}</p>
                    {member.address && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{member.address}</p>
                    )}
                  </div>

                  <span
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-full shrink-0 ${
                      subscriptionPaid >= target
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {subscriptionPaid >= target ? 'वर्गणी पूर्ण' : 'अपूर्ण'}
                  </span>
                </div>

                {/* Subscription Progress Bar */}
                <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">वार्षिक वर्गणी प्रगती:</span>
                    <span className="text-blue-700">
                      ₹{subscriptionPaid.toLocaleString('en-IN')} / ₹{target.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        subscriptionPaid >= target ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-right text-slate-400">
                    {percentage}% पूर्ण | बाकी: ₹{remainingSubscription.toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Extra Donation Indicator */}
                {extraDonationPaid > 0 && (
                  <div className="mt-3 p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center text-xs">
                    <span className="text-emerald-800 font-semibold">
                      अतिरिक्त देणगी (Donation):
                    </span>
                    <span className="font-bold text-emerald-700">
                      + ₹{extraDonationPaid.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">एकूण जमा जमाव:</span>
                  <span className="font-black text-slate-800 text-xs">
                    ₹{(subscriptionPaid + extraDonationPaid).toLocaleString('en-IN')}
                  </span>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenShareModal(member)}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-amber-200"
                      title="पासवर्ड व्यवस्थापन व इमेल लिंक"
                    >
                      <Key className="w-3 h-3 text-amber-600" />
                      <span>{member.password ? '🔑 पासवर्ड' : '➕ पासवर्ड'}</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(member)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      title="माहिती संपादन / पद बदला"
                    >
                      <Edit2 className="w-3 h-3 text-blue-600" />
                      <span>संपादित करा</span>
                    </button>
                    <button
                      onClick={() => setMemberToDelete(member)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
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
    </div>
  );
};
