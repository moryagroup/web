import React, { useState } from 'react';
import { Member, CurrentUser } from '../types';
import moryaLogo from '../assets/morya_logo.jpg';
import { getDesignationRank } from '../utils/rbac';
import { LogoLightboxModal } from './LogoLightboxModal';
import {
  LogIn,
  ShieldCheck,
  User,
  Key,
  Lock,
  Mail,
  Send,
  Copy,
  Check,
  ArrowLeft,
  AlertCircle,
  Share2,
  Maximize2,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currentUser?: CurrentUser;
  groupLogo?: string;
  onLoginSuccess: (user: CurrentUser) => void;
  initialSelectedMemberId?: string;
  initialLoginType?: 'admin' | 'member';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  members,
  currentUser,
  groupLogo,
  onLoginSuccess,
  initialSelectedMemberId,
  initialLoginType,
}) => {
  const [loginType, setLoginType] = useState<'admin' | 'member'>('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    members[0]?.id || ''
  );

  // Sync initial props on open
  React.useEffect(() => {
    if (isOpen) {
      if (initialLoginType) {
        setLoginType(initialLoginType);
      }
      if (initialSelectedMemberId && initialSelectedMemberId !== 'ADMIN_ACCOUNT') {
        setSelectedMemberId(initialSelectedMemberId);
      }
      setMemberPassword('');
      setPasswordError(null);
      setShowResetView(false);
    }
  }, [isOpen, initialSelectedMemberId, initialLoginType]);

  // Password reset link view mode
  const [showResetView, setShowResetView] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState(false);

  if (!isOpen) return null;

  const sortedMembers = [...members].sort((a, b) => {
    const rankA = getDesignationRank(a.designation);
    const rankB = getDesignationRank(b.designation);
    if (rankA !== rankB) return rankA - rankB;
    return a.fullName.localeCompare(b.fullName);
  });

  const selectedMember = members.find((m) => m.id === selectedMemberId) || sortedMembers[0];

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (adminPassword.trim() !== 'Tom&jerry5633#') {
      setPasswordError('चुकीचा ॲडमिन पासवर्ड! कृपया अचूक पासवर्ड प्रविष्ट करा.');
      return;
    }

    onLoginSuccess({
      name: 'सिस्टम ॲडमिन',
      role: 'ॲडमिन',
      phone: '९८२२०१०१००',
      isLoggedIn: true,
    });
    setAdminPassword('');
    setPasswordError(null);
    onClose();
  };

  const handleMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    const isAdminLoggedIn = currentUser?.role === 'ॲडमिन' && currentUser?.isLoggedIn !== false;

    if (selectedMember) {
      // If member has a set password and current user is NOT Admin
      if (!isAdminLoggedIn && selectedMember.password && selectedMember.password.trim() !== '') {
        if (!memberPassword.trim() || memberPassword.trim() !== selectedMember.password.trim()) {
          setPasswordError('चुकीचा पासवर्ड! कृपया बरोबर पासवर्ड प्रविष्ट करा.');
          return;
        }
      }

      onLoginSuccess({
        name: selectedMember.fullName,
        role: (selectedMember.designation as any) || 'सभासद',
        phone: selectedMember.phone,
        email: selectedMember.email,
        birthDate: selectedMember.birthDate,
        age: selectedMember.age,
        isLoggedIn: true,
      });
      setMemberPassword('');
      setPasswordError(null);
      onClose();
    }
  };

  // Generate Email Reset Link
  const targetEmail = resetEmail.trim() || selectedMember?.email || 'moryagroupdata@gmail.com';
  const resetLink = `${window.location.origin}/#reset-password?memberId=${selectedMember?.memberCode || 'M-101'}&token=${Date.now()}`;

  const handleCopyResetLink = () => {
    navigator.clipboard.writeText(resetLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSendEmailLink = () => {
    const subject = encodeURIComponent('मोरया ग्रुप मित्र मंडळ - पासवर्ड रिसेट लिंक (Password Reset Link)');
    const body = encodeURIComponent(
      `नमस्कार ${selectedMember?.fullName || 'सभासद'},\n\nमोरया ग्रुप मित्र मंडळ (ट्रस्ट) डिजिटल प्रणालीचा पासवर्ड बदलण्यासाठी किंवा रिसेट करण्यासाठी खालील लिंकवर क्लिक करा:\n\n${resetLink}\n\nधन्यवाद,\nमोरया ग्रुप मित्र मंडळ (ट्रस्ट)\nहडपसर गोंधळनगर, पुणे`
    );
    window.open(`mailto:${targetEmail}?subject=${subject}&body=${body}`, '_blank');
    setResetSuccessMessage(true);
    setTimeout(() => setResetSuccessMessage(false), 4000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 space-y-0">
        {/* Modal Header */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 p-6 text-center text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
          <div className="relative inline-block mb-3 group">
            <img
              src={groupLogo || moryaLogo}
              alt="मोरया ग्रुप लोगो"
              onClick={() => setIsLightboxOpen(true)}
              title="मोठा लोगो पहा (WhatsApp Style)"
              className="w-20 h-20 object-contain rounded-full border-2 border-amber-400 shadow-xl bg-slate-950 p-1 mx-auto cursor-pointer transition-transform group-hover:scale-105"
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
          <h2 className="text-lg font-black text-amber-400">
            मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
          </h2>
          <p className="text-xs text-orange-200/90 font-bold mt-0.5">
            हडपसर गोंधळनगर • डिजिटल प्रणाली लॉगिन
          </p>
        </div>

        {/* Password Reset Screen View */}
        {showResetView ? (
          <div className="p-6 space-y-4 text-xs">
            <button
              onClick={() => setShowResetView(false)}
              className="flex items-center gap-1.5 text-amber-600 hover:text-amber-700 font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>मागे लॉगिन स्क्रीनवर जा</span>
            </button>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-xs">
                <Mail className="w-4 h-4 text-amber-600" />
                <span>ई-मेल वर पासवर्ड रिसेट लिंक पाठवा (Password Reset Link)</span>
              </p>
              <p className="text-[11px] text-amber-800">
                निवडलेल्या सभासदाच्या इमेल आयडीवर रिसेट लिंक पाठवून नवीन पासवर्ड सेट करता येईल.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                सभासद निवडा:
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => {
                  setSelectedMemberId(e.target.value);
                  const m = members.find((x) => x.id === e.target.value);
                  if (m?.email) setResetEmail(m.email);
                }}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
              >
                {sortedMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    👤 {m.fullName} ({m.memberCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                सभासदाचा ई-मेल आयडी (Mail ID):
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={resetEmail || selectedMember?.email || 'moryagroupdata@gmail.com'}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="moryagroupdata@gmail.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            {/* Generated Reset Link preview */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                तयार झालेली पासवर्ड रिसेट लिंक:
              </label>
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 break-all">
                {resetLink}
              </div>
            </div>

            {resetSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-bold text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>ई-मेल ॲप उघडले आहे! लिंक पाठवून पासवर्ड रिसेट करा.</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSendEmailLink}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>इमेल वर लिंक पाठवा (Send Mail)</span>
              </button>

              <button
                onClick={handleCopyResetLink}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'कॉपी झाली!' : 'कॉपी करा'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Selection */}
            <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1">
              <button
                onClick={() => setLoginType('admin')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  loginType === 'admin'
                    ? 'bg-slate-900 text-amber-400 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>👑 ॲडमिन (Admin)</span>
              </button>
              <button
                onClick={() => setLoginType('member')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  loginType === 'member'
                    ? 'bg-slate-900 text-amber-400 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <User className="w-4 h-4 text-amber-400" />
                <span>👤 पदाधिकारी / सभासद</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {loginType === 'admin' ? (
                <form onSubmit={handleAdminSubmit} className="space-y-4 text-xs">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      सुरक्षित ॲडमिन खाते (Full Control)
                    </p>
                    <p className="text-[11px] text-purple-700">
                      नवीन सभासद जोडणे, काढणे, पद बदलणे आणि सर्व आर्थिक नोंदी पाहण्याचे व नियंत्रित करण्याचे पूर्ण अधिकार.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ॲडमिन पासवर्ड (Admin Password):
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => {
                          setAdminPassword(e.target.value);
                          setPasswordError(null);
                        }}
                        placeholder="ॲडमिन पासवर्ड प्रविष्ट करा"
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  {passwordError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>ॲडमिन म्हणून लॉगिन करा</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleMemberSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      तुमचे नाव आणि पद निवडा:
                    </label>
                    <select
                      value={selectedMemberId}
                      onChange={(e) => {
                        setSelectedMemberId(e.target.value);
                        setPasswordError(null);
                      }}
                      className="w-full p-3 border border-slate-300 rounded-xl bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                    >
                      {sortedMembers.map((m) => {
                        const isBearer = m.designation && m.designation !== 'सभासद';
                        const hasPass = m.password && m.password.trim() !== '';
                        return (
                          <option key={m.id} value={m.id}>
                            {isBearer ? '🏅' : '👤'} {m.fullName} ({m.designation || 'सभासद'}) {hasPass ? '🔒' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Member Password Input */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-slate-700">
                        खात्याचा पासवर्ड / PIN:
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowResetView(true)}
                        className="text-[11px] text-amber-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Mail className="w-3 h-3" />
                        <span>पासवर्ड विसरलात? मेलवर लिंक मागवा</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={memberPassword}
                        onChange={(e) => {
                          setMemberPassword(e.target.value);
                          setPasswordError(null);
                        }}
                        placeholder={
                          selectedMember?.password
                            ? 'सेट केलेला पासवर्ड प्रविष्ट करा'
                            : 'पासवर्ड (असेल तर प्रविष्ट करा नसेल तर मोकळे सोडा)'
                        }
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    {selectedMember?.password ? (
                      currentUser?.role === 'ॲडमिन' && currentUser?.isLoggedIn !== false ? (
                        <p className="text-[10px] text-purple-700 font-bold mt-1 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-purple-600" />
                          <span>👑 ॲडमिन मोड: आपण पासवर्ड शिवाय या खात्यावर स्विच करू शकता.</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-amber-800 font-bold mt-1 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span>🔒 पासवर्ड सेट आहे: लॉगिन / स्विच करण्यासाठी बरोबर पासवर्ड प्रविष्ट करा.</span>
                        </p>
                      )
                    ) : (
                      <p className="text-[10px] text-slate-500 font-bold mt-1">
                        या खात्यास अद्याप पासवर्ड सेट केलेला नाही (थेट लॉगिन शक्य).
                      </p>
                    )}
                  </div>

                  {passwordError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] space-y-1">
                    <p className="font-bold">पद-आधारित नियम (RBAC):</p>
                    <p className="text-amber-800">
                      फक्त <strong>अध्यक्ष, खजिनदार, उपखजिनदार</strong> खात्यांना पूर्ण आर्थिक डेटाचा अधिकार असेल.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <LogIn className="w-4 h-4 text-amber-400" />
                    <span>निवडलेल्या पदाने लॉगिन करा</span>
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>

      <LogoLightboxModal
        isOpen={isLightboxOpen}
        logoSrc={groupLogo}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
};

