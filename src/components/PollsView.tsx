import React, { useState, useMemo } from 'react';
import { Poll, PollOption, PollVote, PollTargetAudience, CurrentUser, Member } from '../types';
import { isBadgedMember, hasAdminPermissions } from '../utils/rbac';
import { notificationService } from '../services/notificationService';
import {
  Vote,
  PlusCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Users,
  ShieldCheck,
  Award,
  Clock,
  Check,
  X,
  Share2,
  Trash2,
  BarChart3,
  Calendar,
  AlertCircle,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  UserCheck,
  User,
} from 'lucide-react';

interface PollsViewProps {
  polls: Poll[];
  currentUser: CurrentUser;
  members: Member[];
  onSavePoll: (poll: Poll) => void;
  onDeletePoll?: (pollId: string) => void;
  onNavigate?: (tab: string) => void;
  onOpenLogin?: () => void;
}

const CATEGORIES = [
  'निर्णय / ठराव',
  'नवीन चर्चा',
  'उत्सव नियोजन',
  'खर्च / अंदाजपत्रक',
  'इतर',
];

const PRESET_TEMPLATES = [
  {
    label: 'होय / नाही / तटस्थ (Yes / No)',
    options: ['सहमत / होय', 'असहमत / नाही', 'तटस्थ / विचार करू'],
  },
  {
    label: 'मंजूर / नामंजूर (Approval)',
    options: ['मंजूर (Approved)', 'नामंजूर (Rejected)', 'पुढील बैठकीत चर्चा करू'],
  },
  {
    label: 'अंदाजपत्रक / बजेट मान्यता',
    options: ['प्रस्तावित खर्चास मान्यता', 'खर्चात कपात करावी', 'फेरप्रस्ताव सादर करावा'],
  },
  {
    label: '३ बहुपर्यायी पर्याय (3 Options)',
    options: ['पर्याय १', 'पर्याय २', 'पर्याय ३'],
  },
];

const OPTION_COLORS = [
  { bg: 'bg-amber-500', bar: 'from-amber-500 to-amber-600', lightBg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-400' },
  { bg: 'bg-indigo-500', bar: 'from-indigo-500 to-indigo-600', lightBg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-400' },
  { bg: 'bg-emerald-500', bar: 'from-emerald-500 to-emerald-600', lightBg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-400' },
  { bg: 'bg-rose-500', bar: 'from-rose-500 to-rose-600', lightBg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-400' },
  { bg: 'bg-cyan-500', bar: 'from-cyan-500 to-cyan-600', lightBg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-400' },
  { bg: 'bg-purple-500', bar: 'from-purple-500 to-purple-600', lightBg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-400' },
];

export const PollsView: React.FC<PollsViewProps> = ({
  polls,
  currentUser,
  members,
  onSavePoll,
  onDeletePoll,
  onOpenLogin,
}) => {
  const isLoggedIn = currentUser.isLoggedIn !== false;
  const isCommitteeMember = isLoggedIn && (isBadgedMember(currentUser.role) || hasAdminPermissions(currentUser.role));
  const isAdmin = isLoggedIn && hasAdminPermissions(currentUser.role);

  // Find current user's matching member record
  const currentMemberRecord = useMemo(() => {
    if (!isLoggedIn) return null;
    return members.find(
      (m) =>
        (currentUser.phone && m.phone === currentUser.phone) ||
        (m.fullName && m.fullName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    );
  }, [members, currentUser, isLoggedIn]);

  const currentMemberId = currentMemberRecord?.id || currentUser.phone || currentUser.name;

  // Committee members list (for participation tracking)
  const committeeMembersList = useMemo(() => {
    return members.filter((m) => isBadgedMember(m.designation) || hasAdminPermissions(m.designation));
  }, [members]);

  // Tab & Filters state
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'ACTIVE' | 'COMMITTEE' | 'ALL_MEMBERS' | 'DECIDED' | 'MY_PENDING'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDecisionModal, setShowDecisionModal] = useState<Poll | null>(null);
  const [decisionText, setDecisionText] = useState<string>('');
  const [expandedVotersPollId, setExpandedVotersPollId] = useState<string | null>(null);

  // Form state for creating a new poll
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('निर्णय / ठराव');
  const [formTargetAudience, setFormTargetAudience] = useState<PollTargetAudience>('COMMITTEE_ONLY');
  const [formOptions, setFormOptions] = useState<string[]>(['सहमत / होय', 'असहमत / नाही']);
  const [formExpiresAt, setFormExpiresAt] = useState<string>('');
  const [formAllowChangeVote, setFormAllowChangeVote] = useState<boolean>(true);
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Helper to check if current user is eligible to vote in a poll
  const canUserVoteInPoll = (poll: Poll): { canVote: boolean; reason?: string } => {
    if (!isLoggedIn) {
      return { canVote: false, reason: 'मतदान करण्यासाठी लॉग इन आवश्यक आहे.' };
    }
    if (poll.status !== 'सक्रिय') {
      return { canVote: false, reason: 'हे मतदान सध्या बंद किंवा निकाली झाले आहे.' };
    }
    if (poll.expiresAt) {
      const expiryDate = new Date(poll.expiresAt);
      expiryDate.setHours(23, 59, 59, 999);
      if (new Date() > expiryDate) {
        return { canVote: false, reason: 'मतदानाची मुदत संपली आहे.' };
      }
    }
    if (poll.targetAudience === 'COMMITTEE_ONLY') {
      if (!isCommitteeMember) {
        return { canVote: false, reason: 'हे मतदान फक्त समिती / कार्यकारणी पदाधिकाऱ्यांसाठी आहे.' };
      }
    }
    return { canVote: true };
  };

  // Helper to check if current user has already voted
  const getUserVote = (poll: Poll): PollVote | undefined => {
    if (!isLoggedIn) return undefined;
    return (poll.votes || []).find(
      (v) =>
        v.memberId === currentMemberId ||
        (currentUser.phone && v.memberId === currentUser.phone) ||
        v.memberName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
    );
  };

  // KPI Counts
  const kpiStats = useMemo(() => {
    const total = polls.length;
    const active = polls.filter((p) => p.status === 'सक्रिय').length;
    const decided = polls.filter((p) => p.status === 'निकाली' || p.status === 'बंद').length;
    const myPending = polls.filter((p) => {
      if (p.status !== 'सक्रिय') return false;
      const { canVote } = canUserVoteInPoll(p);
      if (!canVote) return false;
      const userVote = getUserVote(p);
      return !userVote;
    }).length;

    return { total, active, decided, myPending };
  }, [polls, isLoggedIn, isCommitteeMember, currentMemberId, currentUser]);

  // Filtered polls
  const filteredPolls = useMemo(() => {
    return polls.filter((poll) => {
      // Category filter
      if (selectedCategory !== 'ALL' && poll.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = poll.title.toLowerCase().includes(q);
        const matchesDesc = (poll.description || '').toLowerCase().includes(q);
        const matchesCreator = poll.createdByName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCreator) return false;
      }
      // Tab filter
      if (activeFilterTab === 'ACTIVE') return poll.status === 'सक्रिय';
      if (activeFilterTab === 'COMMITTEE') return poll.targetAudience === 'COMMITTEE_ONLY';
      if (activeFilterTab === 'ALL_MEMBERS') return poll.targetAudience === 'ALL_MEMBERS';
      if (activeFilterTab === 'DECIDED') return poll.status === 'निकाली' || poll.status === 'बंद';
      if (activeFilterTab === 'MY_PENDING') {
        if (poll.status !== 'सक्रिय') return false;
        const { canVote } = canUserVoteInPoll(poll);
        if (!canVote) return false;
        return !getUserVote(poll);
      }
      return true;
    });
  }, [polls, activeFilterTab, selectedCategory, searchQuery, isLoggedIn, isCommitteeMember, currentMemberId, currentUser]);

  // Handle vote submission
  const handleCastVote = (poll: Poll, optionId: string) => {
    const { canVote, reason } = canUserVoteInPoll(poll);
    if (!canVote) {
      if (!isLoggedIn && onOpenLogin) {
        onOpenLogin();
      } else {
        alert(reason || 'आपण या मतदानात मत देऊ शकत नाही.');
      }
      return;
    }

    const existingVote = getUserVote(poll);
    if (existingVote && existingVote.optionId === optionId) {
      // Already voted this option
      return;
    }

    if (existingVote && !poll.allowChangeVote) {
      alert('या मतदानात मत बदलण्याची मुभा नाही.');
      return;
    }

    const newVote: PollVote = {
      memberId: currentMemberId,
      memberName: currentUser.name,
      memberRole: currentUser.role || 'सभासद',
      optionId,
      votedAt: new Date().toISOString(),
    };

    // Filter out previous vote by same user if updating
    const remainingVotes = (poll.votes || []).filter(
      (v) =>
        v.memberId !== currentMemberId &&
        (!currentUser.phone || v.memberId !== currentUser.phone) &&
        v.memberName.trim().toLowerCase() !== currentUser.name.trim().toLowerCase()
    );

    const updatedPoll: Poll = {
      ...poll,
      votes: [...remainingVotes, newVote],
      updatedAt: new Date().toISOString(),
    };

    onSavePoll(updatedPoll);
    showToast('आपले मत यशस्वीरित्या नोंदवले गेले आहे! ✔️');
  };

  // Handle creating new poll
  const handleCreatePollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('कृपया मतदानाचा विषय / प्रश्न प्रविष्ट करा.');
      return;
    }

    const validOptions = formOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (validOptions.length < 2) {
      setFormError('मतदानासाठी किमान २ पर्याय आवश्यक आहेत.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const newPollOptions: PollOption[] = validOptions.map((text, idx) => ({
      id: `opt-${idx + 1}`,
      text,
    }));

    const pollNo = `POLL-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newPoll: Poll = {
      id: `poll-${Date.now()}`,
      pollNo,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      category: formCategory,
      targetAudience: formTargetAudience,
      options: newPollOptions,
      votes: [],
      status: 'सक्रिय',
      createdByMemberId: currentMemberId,
      createdByName: currentUser.name,
      createdByRole: currentUser.role,
      createdAt: new Date().toISOString(),
      expiresAt: formExpiresAt || undefined,
      allowChangeVote: formAllowChangeVote,
    };

    onSavePoll(newPoll);

    // Notification broadcast
    notificationService.notify({
      type: 'poll_created',
      title: `नवीन मतदान: ${newPoll.title}`,
      message: `${newPoll.createdByName} (${newPoll.createdByRole}) यांनी '${newPoll.targetAudience === 'COMMITTEE_ONLY' ? 'फक्त कार्यकारणी सदस्यांसाठी' : 'सर्व सभासदांसाठी'}' नवीन मतदान सुरू केले.`,
      targetTab: 'polls',
    });

    setIsSubmitting(false);
    setShowCreateModal(false);
    // Reset form
    setFormTitle('');
    setFormDescription('');
    setFormOptions(['सहमत / होय', 'असहमत / नाही']);
    setFormExpiresAt('');
    setFormTargetAudience('COMMITTEE_ONLY');
    showToast('नवीन मतदान यशस्वीरित्या सुरू करण्यात आले! 🗳️');
  };

  // Handle closing / re-opening a poll
  const handleTogglePollStatus = (poll: Poll) => {
    const isCurrentlyActive = poll.status === 'सक्रिय';
    const updatedStatus = isCurrentlyActive ? 'बंद' : 'सक्रिय';
    const updatedPoll: Poll = {
      ...poll,
      status: updatedStatus,
      updatedAt: new Date().toISOString(),
    };
    onSavePoll(updatedPoll);
    showToast(isCurrentlyActive ? 'मतदान प्रक्रिया बंद केली आहे.' : 'मतदान पुन्हा सक्रिय केले आहे.');
  };

  // Handle recording final decision
  const handleSaveDecision = () => {
    if (!showDecisionModal || !decisionText.trim()) return;

    const updatedPoll: Poll = {
      ...showDecisionModal,
      status: 'निकाली',
      finalDecision: decisionText.trim(),
      finalDecisionBy: `${currentUser.name} (${currentUser.role || 'ॲडमिन'})`,
      finalDecisionByRole: currentUser.role,
      finalDecisionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSavePoll(updatedPoll);

    notificationService.notify({
      type: 'poll_decided',
      title: `अंतिम निर्णय जारी: ${updatedPoll.title}`,
      message: `मतदानाचा अधिकृत निर्णय: "${decisionText.trim()}"`,
      targetTab: 'polls',
    });

    setShowDecisionModal(null);
    setDecisionText('');
    showToast('अधिकृत निर्णय यशस्वीरित्या नोंदवला गेला! 🏆');
  };

  // Handle deleting a poll
  const handleDelete = (poll: Poll) => {
    if (confirm(`तुम्हाला खात्री आहे का? '${poll.title}' हे मतदान कायमचे हटवायचे आहे का?`)) {
      if (onDeletePoll) {
        onDeletePoll(poll.id);
      }
      showToast('मतदान हटवण्यात आले.');
    }
  };

  // WhatsApp Share helper
  const handleShareWhatsApp = (poll: Poll) => {
    const totalVotes = (poll.votes || []).length;
    let message = `🚩 *मोरया मित्र मंडळ, गोंधळनगर* 🚩\n`;
    message += `🗳️ *मतदान व निर्णय: ${poll.title}*\n`;
    message += `📋 क्रमांक: ${poll.pollNo}\n`;
    message += `👥 सहभाग: ${poll.targetAudience === 'COMMITTEE_ONLY' ? 'फक्त कार्यकारणी सदस्य' : 'सर्व सभासद'}\n`;
    message += `📊 एकूण मते: ${totalVotes}\n\n`;
    message += `*पर्याय व चालू स्थिती:*\n`;

    poll.options.forEach((opt, idx) => {
      const optVotes = (poll.votes || []).filter((v) => v.optionId === opt.id).length;
      const pct = totalVotes > 0 ? ((optVotes / totalVotes) * 100).toFixed(1) : '0';
      message += `${idx + 1}. ${opt.text}: *${optVotes} मते (${pct}%)*\n`;
    });

    if (poll.finalDecision) {
      message += `\n🏆 *अंतिम निर्णय:* ${poll.finalDecision}\n`;
      message += `✍️ निर्णय नोंद: ${poll.finalDecisionBy || ''}\n`;
    } else if (poll.status === 'सक्रिय') {
      message += `\n⏳ *मतदान सुरू आहे!* कृपया ॲपमध्ये जाऊन आपले मत नोंदवा.\n`;
    }

    message += `\n📲 _मोरया ग्रुप ॲपवरून प्रसारित_`;

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Helper to load a preset template into form
  const applyPresetTemplate = (template: { label: string; options: string[] }) => {
    setFormOptions([...template.options]);
  };

  const handleAddOptionField = () => {
    if (formOptions.length >= 8) {
      alert('एका मतदानासाठी जास्तीत जास्त ८ पर्याय ठेवता येतील.');
      return;
    }
    setFormOptions([...formOptions, `पर्याय ${formOptions.length + 1}`]);
  };

  const handleRemoveOptionField = (index: number) => {
    if (formOptions.length <= 2) {
      alert('किमान २ पर्याय आवश्यक आहेत.');
      return;
    }
    setFormOptions(formOptions.filter((_, i) => i !== index));
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const updated = [...formOptions];
    updated[index] = text;
    setFormOptions(updated);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400/30 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span className="text-sm font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-3">
              <Vote className="w-4 h-4 text-amber-200" /> लोकशाही निर्णय प्रक्रिया
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              मतदान व निर्णय प्रणाली (Polls & Decisions)
            </h1>
            <p className="text-amber-100 text-sm mt-1 max-w-2xl">
              मंडळाच्या कोणत्याही नवीन ठरावासाठी, उत्सवाच्या नियोजनासाठी व महत्त्वपूर्ण विषयावर कार्यकारणी व सभासदांचे पारदर्शक मतदान.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isCommitteeMember ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-3 bg-white text-orange-700 hover:bg-amber-50 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
              >
                <PlusCircle className="w-5 h-5 text-orange-600" />
                नवीन मतदान सुरू करा
              </button>
            ) : !isLoggedIn ? (
              <button
                onClick={onOpenLogin}
                className="px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl font-semibold text-sm flex items-center gap-2 border border-white/30 transition-all"
              >
                <UserCheck className="w-4 h-4" /> मतदानासाठी लॉग इन करा
              </button>
            ) : (
              <div className="px-4 py-2 bg-white/15 backdrop-blur-md rounded-xl text-xs font-medium border border-white/20 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-200" /> सर्व सभासद मतदानात सहभागी होऊ शकतात
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Vote className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{kpiStats.total}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">एकूण मतदान (Total)</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{kpiStats.active}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">सक्रिय मतदान (Active)</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{kpiStats.decided}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">अंतिम निर्णय (Decided)</div>
          </div>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm flex items-center gap-3.5 transition-all ${
          kpiStats.myPending > 0
            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 animate-pulse'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            kpiStats.myPending > 0
              ? 'bg-rose-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
          }`}>
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className={`text-2xl font-black ${kpiStats.myPending > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
              {kpiStats.myPending}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">माझे प्रलंबित मत (Pending)</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Row */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Main Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
            <button
              onClick={() => setActiveFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFilterTab === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              सर्व ({kpiStats.total})
            </button>
            <button
              onClick={() => setActiveFilterTab('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilterTab === 'ACTIVE'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              🟢 चालू मतदान ({kpiStats.active})
            </button>
            <button
              onClick={() => setActiveFilterTab('COMMITTEE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilterTab === 'COMMITTEE'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              फक्त कार्यकारणी
            </button>
            <button
              onClick={() => setActiveFilterTab('ALL_MEMBERS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilterTab === 'ALL_MEMBERS'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              सर्व सभासद
            </button>
            <button
              onClick={() => setActiveFilterTab('DECIDED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilterTab === 'DECIDED'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              अंतिम निकाल / निर्णय ({kpiStats.decided})
            </button>
            {kpiStats.myPending > 0 && (
              <button
                onClick={() => setActiveFilterTab('MY_PENDING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeFilterTab === 'MY_PENDING'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                }`}
              >
                ⚠️ माझे मतदान बाकी ({kpiStats.myPending})
              </button>
            )}
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">सर्व वर्गवारी</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div className="relative flex-1 md:w-60">
              <input
                type="text"
                placeholder="विषय / प्रश्न शोधा..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Poll Cards List */}
      {filteredPolls.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <Vote className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">कोणतेही मतदान आढळले नाही</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            निवडलेल्या फिल्टरनुसार सध्या कोणतेही मतदान उपलब्ध नाही.
          </p>
          {isCommitteeMember && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-5 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow"
            >
              <PlusCircle className="w-4 h-4" /> नवीन मतदान सुरू करा
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPolls.map((poll) => {
            const totalVotes = (poll.votes || []).length;
            const userVote = getUserVote(poll);
            const { canVote, reason } = canUserVoteInPoll(poll);

            // Compute leading option
            let highestVoteCount = 0;
            let highestOptionId = '';
            poll.options.forEach((opt) => {
              const count = (poll.votes || []).filter((v) => v.optionId === opt.id).length;
              if (count > highestVoteCount) {
                highestVoteCount = count;
                highestOptionId = opt.id;
              }
            });

            // Committee participation calculation
            const committeeVotesCount = (poll.votes || []).filter((v) => {
              const member = members.find((m) => m.id === v.memberId || m.fullName === v.memberName);
              return (
                (member && isBadgedMember(member.designation)) ||
                isBadgedMember(v.memberRole) ||
                v.memberRole === 'ॲडमिन'
              );
            }).length;

            const isExpandedVoters = expandedVotersPollId === poll.id;

            return (
              <div
                key={poll.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden ${
                  poll.status === 'सक्रिय'
                    ? 'border-amber-200 dark:border-amber-900/40'
                    : poll.status === 'निकाली'
                    ? 'border-emerald-300 dark:border-emerald-900/50 bg-emerald-50/10'
                    : 'border-slate-200 dark:border-slate-700 opacity-90'
                }`}
              >
                {/* Top Badge Bar */}
                <div className="bg-slate-50 dark:bg-slate-900/70 px-5 py-3 border-b border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    {/* Status Badge */}
                    {poll.status === 'सक्रिय' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        🟢 सक्रिय मतदान
                      </span>
                    ) : poll.status === 'निकाली' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold">
                        <Award className="w-3.5 h-3.5" />
                        🏆 अंतिम निर्णय जारी
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Lock className="w-3.5 h-3.5" />
                        मतदान बंद
                      </span>
                    )}

                    {/* Target Audience Badge */}
                    {poll.targetAudience === 'COMMITTEE_ONLY' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        फक्त कार्यकारणी सदस्य
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium">
                        <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        सर्व सभासद मतदान
                      </span>
                    )}

                    {/* Category */}
                    <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">
                      {poll.category}
                    </span>

                    {/* Poll No */}
                    <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                      {poll.pollNo}
                    </span>
                  </div>

                  {/* Deadline or Expiry */}
                  {poll.expiresAt && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>मुदत: <strong>{poll.expiresAt}</strong></span>
                    </div>
                  )}
                </div>

                <div className="p-5 md:p-6 space-y-5">
                  {/* Title & Description */}
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 leading-snug">
                      {poll.title}
                    </h2>
                    {poll.description && (
                      <p className="text-slate-600 dark:text-slate-300 text-sm mt-2 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        {poll.description}
                      </p>
                    )}
                  </div>

                  {/* Creator info & vote count meta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-500" />
                      <span>प्रस्तावक: <strong>{poll.createdByName}</strong> ({poll.createdByRole || 'सदस्य'})</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span>{new Date(poll.createdAt).toLocaleDateString('mr-IN')}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Vote className="w-4 h-4 text-amber-500" />
                        एकूण मते: <span className="text-amber-600 dark:text-amber-400 text-sm">{totalVotes}</span>
                      </div>

                      {poll.targetAudience === 'COMMITTEE_ONLY' && (
                        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                          कार्यकारणी सहभाग: {committeeVotesCount} / {committeeMembersList.length || 6}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Options Voting & Stats Section */}
                  <div className="space-y-3 pt-2">
                    {poll.options.map((option, idx) => {
                      const optionVotesCount = (poll.votes || []).filter((v) => v.optionId === option.id).length;
                      const percentage = totalVotes > 0 ? (optionVotesCount / totalVotes) * 100 : 0;
                      const isWinning = totalVotes > 0 && option.id === highestOptionId && highestVoteCount > 0;
                      const isMyVote = userVote?.optionId === option.id;
                      const colorTheme = OPTION_COLORS[idx % OPTION_COLORS.length];

                      return (
                        <div
                          key={option.id}
                          className={`group relative rounded-xl border p-3.5 md:p-4 transition-all duration-200 ${
                            isMyVote
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20 shadow-sm'
                              : isWinning && poll.status !== 'सक्रिय'
                              ? 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/20'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          {/* Option Header */}
                          <div className="flex items-center justify-between gap-3 relative z-10">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                isMyVote
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-100 truncate">
                                {option.text}
                              </span>

                              {/* My Vote Badge */}
                              {isMyVote && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-xs shrink-0">
                                  <Check className="w-3 h-3" /> आपले मत
                                </span>
                              )}

                              {/* Highest votes badge */}
                              {isWinning && (
                                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shrink-0">
                                  <Sparkles className="w-3 h-3" /> सर्वाधिक मते
                                </span>
                              )}
                            </div>

                            {/* Percentage & Vote Count */}
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span className="text-sm md:text-base font-black text-slate-900 dark:text-slate-100">
                                  {percentage.toFixed(1)}%
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                                  ({optionVotesCount} मते)
                                </span>
                              </div>

                              {/* Voting Action Button */}
                              {poll.status === 'सक्रिय' && (
                                <button
                                  onClick={() => handleCastVote(poll, option.id)}
                                  disabled={isMyVote && !poll.allowChangeVote}
                                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 active:scale-95 shadow-xs flex items-center gap-1.5 ${
                                    isMyVote
                                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-default'
                                      : 'bg-amber-500 hover:bg-amber-600 text-white hover:shadow'
                                  }`}
                                >
                                  {isMyVote ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" /> मत नोंदवले
                                    </>
                                  ) : (
                                    <>
                                      <Vote className="w-3.5 h-3.5" /> मत द्या
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-3 w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                            <div
                              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${colorTheme.bar}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Voter eligibility notification / notice */}
                  {!canVote && poll.status === 'सक्रिय' && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{reason}</span>
                      </div>
                      {!isLoggedIn && onOpenLogin && (
                        <button
                          onClick={onOpenLogin}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shrink-0 shadow-xs"
                        >
                          लॉग इन करा
                        </button>
                      )}
                    </div>
                  )}

                  {/* Official Final Decision Box (If Decided) */}
                  {poll.finalDecision && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-2 border-emerald-400 dark:border-emerald-600 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm">
                        <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        अधिकृत अंतिम निर्णय / निकाल (Official Resolution):
                      </div>
                      <p className="text-slate-800 dark:text-slate-100 text-sm font-semibold leading-relaxed pl-7">
                        "{poll.finalDecision}"
                      </p>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-7 flex flex-wrap items-center gap-2">
                        <span>निर्णय नोंद: <strong>{poll.finalDecisionBy || 'कार्यकारणी मंडळ'}</strong></span>
                        {poll.finalDecisionAt && (
                          <>
                            <span>•</span>
                            <span>{new Date(poll.finalDecisionAt).toLocaleString('mr-IN')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Expandable Voters Transparency Sheet */}
                  {isExpandedVoters && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-amber-500" />
                          मतदान केलेल्या सदस्यांची यादी ({totalVotes})
                        </span>
                        <button
                          onClick={() => setExpandedVotersPollId(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {totalVotes === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-3">अद्याप कोणीही मतदान केलेले नाही.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                          {(poll.votes || []).map((vote, vIdx) => {
                            const votedOption = poll.options.find((o) => o.id === vote.optionId);
                            return (
                              <div
                                key={vIdx}
                                className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {vote.memberName}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {vote.memberRole || 'सभासद'}
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold text-[11px] truncate max-w-[140px]">
                                  {votedOption?.text || 'पर्याय'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Footer Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      {/* Toggle Voters button */}
                      <button
                        onClick={() => setExpandedVotersPollId(isExpandedVoters ? null : poll.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Users className="w-3.5 h-3.5" />
                        {isExpandedVoters ? 'यादी लपवा' : `मतदारांची यादी (${totalVotes})`}
                        {isExpandedVoters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {/* WhatsApp Share button */}
                      <button
                        onClick={() => handleShareWhatsApp(poll)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 transition-all"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        व्हॉट्सॲपवर शेअर
                      </button>
                    </div>

                    {/* Committee / Admin Management Tools */}
                    {isCommitteeMember && (
                      <div className="flex items-center gap-2">
                        {/* Record Decision Button */}
                        <button
                          onClick={() => {
                            setShowDecisionModal(poll);
                            setDecisionText(poll.finalDecision || '');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-1.5 border border-purple-200 dark:border-purple-800 transition-all"
                        >
                          <Award className="w-3.5 h-3.5" />
                          {poll.finalDecision ? 'निर्णय संपादित करा' : 'अंतिम निर्णय नोंदवा'}
                        </button>

                        {/* Close / Reopen button */}
                        <button
                          onClick={() => handleTogglePollStatus(poll)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 transition-all"
                          title={poll.status === 'सक्रिय' ? 'मतदान बंद करा' : 'मतदान सुरू करा'}
                        >
                          {poll.status === 'सक्रिय' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4 text-emerald-600" />}
                        </button>

                        {/* Delete button (Admin or Creator) */}
                        {(isAdmin || poll.createdByMemberId === currentMemberId) && (
                          <button
                            onClick={() => handleDelete(poll)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-500 hover:text-rose-700 transition-all"
                            title="हटवा"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE NEW POLL MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-8 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Vote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg">नवीन मतदान / चर्चा सुरू करा</h3>
                  <p className="text-xs text-amber-100">कार्यकारणी किंवा सर्व सभासदांसाठी मतदानाचा कौल घ्या</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreatePollSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Target Audience Selector (KEY FEATURE) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-500" />
                  मतदान कोणासाठी आहे? (Target Audience) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      formTargetAudience === 'COMMITTEE_ONLY'
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetAudience"
                      value="COMMITTEE_ONLY"
                      checked={formTargetAudience === 'COMMITTEE_ONLY'}
                      onChange={() => setFormTargetAudience('COMMITTEE_ONLY')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        फक्त कार्यकारणी सदस्य (Committee Only)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        फक्त अध्यक्ष, सचिव, खजिनदार व पदाधिकारी सदस्य मत देऊ शकतील.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      formTargetAudience === 'ALL_MEMBERS'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetAudience"
                      value="ALL_MEMBERS"
                      checked={formTargetAudience === 'ALL_MEMBERS'}
                      onChange={() => setFormTargetAudience('ALL_MEMBERS')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        सर्व सभासद (All Members)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        नोंदणीकृत सर्व सर्वसाधारण सभासद व कार्यकारणी मत देऊ शकतील.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Title / Question */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  मतदानाचा विषय / प्रश्न (Topic / Decision Question) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. गणेशोत्सव २०२६ मुख्य देखावा निवड किंवा नवीन देणगी वर्गणी दर..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Category & Expiry Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    वर्गवारी (Category)
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    मतदान समाप्ती तारीख (Deadline - ऐच्छिक)
                  </label>
                  <input
                    type="date"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Detailed Context / Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  तपशील व संदर्भ (Context & Description - ऐच्छिक)
                </label>
                <textarea
                  rows={2}
                  placeholder="या विषयावर मत का घेत आहोत किंवा काय मुद्दे विचारात घ्यायचे आहेत..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Quick Template Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    तयार पर्याय निवडा (Quick Templates):
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TEMPLATES.map((tmpl, tIdx) => (
                    <button
                      key={tIdx}
                      type="button"
                      onClick={() => applyPresetTemplate(tmpl)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700/60 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-300 hover:text-amber-800 text-[11px] font-semibold rounded-lg transition-all"
                    >
                      + {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options Builder */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    मतदानाचे पर्याय (Options) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddOptionField}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> पर्याय जोडा
                  </button>
                </div>

                <div className="space-y-2">
                  {formOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={`पर्याय ${idx + 1}`}
                        value={opt}
                        onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      {formOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionField(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                          title="पर्याय काढा"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Allow Change Vote Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAllowChangeVote}
                    onChange={(e) => setFormAllowChangeVote(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>सदस्यांना मुदत संपेपर्यंत आपले मत बदलण्याची मुभा द्या (Allow Vote Change)</span>
                </label>
              </div>

              {/* Form Footer */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'तयार करत आहे...' : 'मतदान सुरू करा 🗳️'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD DECISION MODAL */}
      {showDecisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg">अधिकृत निर्णय नोंदवा</h3>
                  <p className="text-xs text-purple-100">मतदानाचा अंतिम निकाल व ठराव नोंदवा</p>
                </div>
              </div>
              <button
                onClick={() => setShowDecisionModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-xs text-slate-500 font-medium">विषय:</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {showDecisionModal.title}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  अंतिम निर्णय / ठराव मजकूर (Official Resolution Note) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="उदा. बहुमतानुसार 'छत्रपती शिवाजी महाराज राज्याभिषेक देखावा' अंतिम करण्यात आला असून पुढील कार्यवाहीचे अधिकार अध्यक्षांना देण्यात आले..."
                  value={decisionText}
                  onChange={(e) => setDecisionText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50"
                >
                  रद्द करा
                </button>
                <button
                  type="button"
                  onClick={handleSaveDecision}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
                >
                  निर्णय जतन करा व निकाल जाहीर करा 🏆
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
