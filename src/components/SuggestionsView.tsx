import React, { useState, useMemo } from 'react';
import { MemberSuggestion, CurrentUser, Member } from '../types';
import { isCoreMemberRole } from '../utils/rbac';
import {
  MessageSquarePlus,
  Send,
  CheckCircle2,
  Clock,
  Check,
  X,
  MessageCircle,
  ShieldCheck,
  User,
  PlusCircle,
  Filter,
  AlertCircle,
  Sparkles,
  Settings,
} from 'lucide-react';

interface SuggestionsViewProps {
  suggestions: MemberSuggestion[];
  currentUser: CurrentUser;
  members: Member[];
  onAddSuggestion: (newSuggestion: MemberSuggestion) => void;
  onUpdateSuggestion: (updatedSuggestion: MemberSuggestion) => void;
  onOpenLogin?: () => void;
}

const CATEGORIES = [
  'उत्सव नियोजन',
  'वर्गणी व हिशोब व्यवस्थापन',
  'महाप्रसाद व अन्नदान',
  'सांस्कृतिक व क्रीडा उपक्रम',
  'सामाजिक व आरोग्य शिबीर',
  'इतर',
];

export const SuggestionsView: React.FC<SuggestionsViewProps> = ({
  suggestions,
  currentUser,
  members,
  onAddSuggestion,
  onUpdateSuggestion,
  onOpenLogin,
}) => {
  const isLoggedIn = currentUser.isLoggedIn !== false;
  const isAdmin = isLoggedIn && (currentUser.role === 'ॲडमिन' || currentUser.role === 'Admin');
  const isCoreMember = isLoggedIn && isCoreMemberRole(currentUser.role);

  // Default target recipient roles selected by Admin
  const [adminSelectedRecipients, setAdminSelectedRecipients] = useState<string[]>([
    'अध्यक्ष',
    'सचिव',
    'खजिनदार',
  ]);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showRecipientConfig, setShowRecipientConfig] = useState<boolean>(false);

  // New suggestion form state
  const [category, setCategory] = useState<string>('उत्सव नियोजन');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([
    'अध्यक्ष',
    'सचिव',
    'खजिनदार',
  ]);

  // Reply modal state for committee members
  const [replyingSuggestion, setReplyingSuggestion] = useState<MemberSuggestion | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [replyStatus, setReplyStatus] = useState<'नवीन' | 'प्रक्रियेत' | 'स्वीकृत' | 'पूर्ण'>('स्वीकृत');

  // Search & Filter
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      if (filterCategory !== 'ALL' && s.category !== filterCategory) return false;
      return true;
    });
  }, [suggestions, filterCategory]);

  const handleSubmitSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const newSug: MemberSuggestion = {
      id: 'sug-' + Date.now(),
      suggestionNo: 'SUG-2026-' + Math.floor(100 + Math.random() * 900),
      memberId: currentUser.phone || 'm-guest',
      memberName: currentUser.name,
      memberPhone: currentUser.phone,
      memberRole: currentUser.role,
      category,
      title: title.trim(),
      description: description.trim(),
      status: 'नवीन',
      recipientRoles: selectedRecipients.length > 0 ? selectedRecipients : adminSelectedRecipients,
      createdAt: new Date().toISOString(),
    };

    onAddSuggestion(newSug);
    setTitle('');
    setDescription('');
    setShowAddModal(false);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingSuggestion || !replyText.trim()) return;

    const updated: MemberSuggestion = {
      ...replyingSuggestion,
      status: replyStatus,
      adminReply: replyText.trim(),
      repliedBy: `${currentUser.name} (${currentUser.role})`,
    };

    onUpdateSuggestion(updated);
    setReplyingSuggestion(null);
    setReplyText('');
  };

  const toggleRecipientRole = (role: string) => {
    if (selectedRecipients.includes(role)) {
      setSelectedRecipients(selectedRecipients.filter((r) => r !== role));
    } else {
      setSelectedRecipients([...selectedRecipients, role]);
    }
  };

  const toggleAdminDefaultRole = (role: string) => {
    if (adminSelectedRecipients.includes(role)) {
      setAdminSelectedRecipients(adminSelectedRecipients.filter((r) => r !== role));
    } else {
      setAdminSelectedRecipients([...adminSelectedRecipients, role]);
    }
  };

  return (
    <div className="space-y-6 my-2">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0">
            <MessageSquarePlus className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-md text-[11px] font-bold uppercase">
                सभासद संवाद व सुचवणी
              </span>
              <span className="text-xs text-amber-400 font-bold">• मोरया ग्रुप मित्र मंडळ</span>
            </div>
            <h2 className="text-xl font-black mt-1 text-white">
              सभासद सूचना व शिफारसी (Member Suggestions)
            </h2>
            <p className="text-xs text-slate-300">
              सर्व सभासदांच्या सूचना थेट निवडक कार्यकारिणी पदाधिकाऱ्यांपर्यंत (अध्यक्ष, सचिव, खजिनदार) पोहोचतात.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 self-stretch md:self-auto shrink-0">
          {isAdmin && (
            <button
              onClick={() => setShowRecipientConfig(!showRecipientConfig)}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all"
              title="सूचना प्राप्तकर्ते पदाधिकारी निवडा"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>पदाधिकारी सेटिंग</span>
            </button>
          )}

          <button
            onClick={() => {
              if (!isLoggedIn) {
                onOpenLogin?.();
              } else {
                setShowAddModal(true);
              }
            }}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ नवीन सूचना मांड</span>
          </button>
        </div>
      </div>

      {/* Admin Recipient Selection Panel */}
      {isAdmin && showRecipientConfig && (
        <div className="bg-amber-50/90 border border-amber-200 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-amber-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              ॲडमिन सेटिंग: सूचना थेट कोणत्या पदाधिकाऱ्यांना पाठवायच्या ते निवडा
            </h3>
            <button
              onClick={() => setShowRecipientConfig(false)}
              className="text-xs text-amber-800 font-bold hover:underline"
            >
              बंद करा ✕
            </button>
          </div>
          <p className="text-xs text-amber-800">
            सभासदांनी मांडलेली कोणतीही नवीन सूचना निवडलेल्या पदाधिकाऱ्यांच्या डॅशबोर्डवर थेट दिसेल.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {['अध्यक्ष', 'सचिव', 'खजिनदार', 'उपखजिनदार', 'कार्याध्यक्ष', 'उपाध्यक्ष'].map((role) => {
              const isChecked = adminSelectedRecipients.includes(role);
              return (
                <label
                  key={role}
                  onClick={() => toggleAdminDefaultRole(role)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  <input type="checkbox" checked={isChecked} onChange={() => {}} className="hidden" />
                  <span>{isChecked ? '✓' : '+'}</span>
                  <span>{role}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggestions List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">वर्गवारीनुसार शोधा:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-50 border border-slate-300 font-bold text-xs rounded-xl p-1.5 focus:outline-none cursor-pointer"
            >
              <option value="ALL">सर्व प्रकार (All Categories)</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-slate-500 font-bold">एकूण सूचना: {filteredSuggestions.length}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSuggestions.map((sug) => {
            const isTargetedToMe =
              isCoreMember &&
              sug.recipientRoles.some((r) => currentUser.role?.includes(r) || currentUser.role === 'ॲडमिन');

            return (
              <div
                key={sug.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow relative"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[10px] rounded-md">
                      {sug.category}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                        sug.status === 'स्वीकृत' || sug.status === 'पूर्ण'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : sug.status === 'प्रक्रियेत'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-amber-50 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {sug.status}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 leading-snug">{sug.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    "{sug.description}"
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex justify-between items-center text-slate-500 text-[11px]">
                    <div className="flex items-center gap-1 font-bold text-slate-700">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      <span>{sug.memberName} ({sug.memberRole || 'सभासद'})</span>
                    </div>
                    <span>{new Date(sug.createdAt).toLocaleDateString('mr-IN')}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                    <span className="font-bold">प्राप्तकर्ते पदाधिकारी:</span>
                    {sug.recipientRoles.map((r) => (
                      <span key={r} className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded font-bold text-slate-700">
                        {r}
                      </span>
                    ))}
                  </div>

                  {/* Committee Reply Display */}
                  {sug.adminReply && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between text-emerald-900 font-bold text-[11px]">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          पदाधिकारी अभिप्राय:
                        </span>
                        <span className="text-[10px] text-emerald-700">{sug.repliedBy}</span>
                      </div>
                      <p className="text-emerald-800 font-medium">{sug.adminReply}</p>
                    </div>
                  )}

                  {/* Action for Core Members to Reply & Update Status */}
                  {isCoreMember && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => {
                          setReplyingSuggestion(sug);
                          setReplyText(sug.adminReply || '');
                          setReplyStatus(sug.status);
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-[11px] rounded-xl shadow flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>उत्तर द्या / अपडेट करा</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Suggestion Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-amber-600" />
                नवीन सूचना / शिफारस मांड
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSuggestion} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">श्रेणी / प्रकार निवडा *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">विषय / मुख्य शीर्षक *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="उदा. गणेशोत्सवात आरोग्य शिबीर व रक्तदान उपक्रम"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">सविस्तर सूचना *</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="आपली सूचना सविस्तरपणे लिहा..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ही सूचना थेट कोणत्या पदाधिकाऱ्यांकडे पाठवायची?
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {['अध्यक्ष', 'सचिव', 'खजिनदार', 'उपखजिनदार', 'कार्याध्यक्ष'].map((role) => {
                    const isChecked = selectedRecipients.includes(role);
                    return (
                      <label
                        key={role}
                        onClick={() => toggleRecipientRole(role)}
                        className={`px-3 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-amber-500 text-slate-950 border-amber-600'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <input type="checkbox" checked={isChecked} onChange={() => {}} className="hidden" />
                        <span>{isChecked ? '✓' : '+'}</span>
                        <span>{role}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow cursor-pointer"
                >
                  सूचना पाठवा
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Committee Reply Modal */}
      {replyingSuggestion && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                सूचनेवर अभिप्राय / उत्तर पाठवा
              </h3>
              <button
                onClick={() => setReplyingSuggestion(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendReply} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="font-bold text-slate-800">{replyingSuggestion.title}</p>
                <p className="text-[11px] text-slate-500">मांडणारे: {replyingSuggestion.memberName}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">स्थिती (Status) निवडा *</label>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="नवीन">नवीन</option>
                  <option value="प्रक्रियेत">प्रक्रियेत (In Progress)</option>
                  <option value="स्वीकृत">स्वीकृत (Accepted)</option>
                  <option value="पूर्ण">पूर्ण (Completed)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">कार्यकारिणी अभिप्राय (Reply Note) *</label>
                <textarea
                  required
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="अभिप्राय किंवा निर्णयाची नोंद लिहा..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReplyingSuggestion(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl shadow cursor-pointer"
                >
                  उत्तर पाठवा
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
