import React, { useState, useRef } from 'react';
import { Member, CurrentUser, IncomeTransaction } from '../types';
import moryaLogo from '../assets/morya_logo.jpg';
import { getMemberSubscriptionPaid, getMemberExtraDonationPaid } from '../services/storageService';
import { hasAdminPermissions } from '../utils/rbac';
import { ImageCropModal } from './ImageCropModal';
import { LogoLightboxModal } from './LogoLightboxModal';
import { ProfilePhotoLightboxModal } from './ProfilePhotoLightboxModal';
import {
  User,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Award,
  Edit,
  Save,
  CheckCircle,
  ShieldCheck,
  Wallet,
  CheckCircle2,
  Lock,
  Cake,
  Hash,
  AlertCircle,
  Camera,
  Upload,
  RotateCcw,
  Maximize2,
  ArrowLeft,
} from 'lucide-react';

interface ProfileViewProps {
  currentUser: CurrentUser;
  members: Member[];
  incomes: IncomeTransaction[];
  groupLogo?: string;
  onUpdateGroupLogo?: (logoUrl: string) => void;
  onUpdateMember: (updatedMember: Member) => void;
  onUpdateCurrentUser: (updatedUser: CurrentUser) => void;
  onNavigate?: (tab: string) => void;
  onOpenLogin: (memberId?: string, type?: 'admin' | 'member') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  members,
  incomes,
  groupLogo,
  onUpdateGroupLogo,
  onUpdateMember,
  onUpdateCurrentUser,
  onNavigate,
  onOpenLogin,
}) => {
  // Find current member profile from members list, or default
  const activeMember = members.find(
    (m) => m.fullName.trim() === currentUser.name.trim()
  ) || members[0];

  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    activeMember?.id || members[0]?.id || ''
  );

  const currentProfile = members.find((m) => m.id === selectedMemberId) || activeMember;
  const isAdmin = hasAdminPermissions(currentUser.role) && currentUser.isLoggedIn !== false;
  const profileLogoInputRef = useRef<HTMLInputElement>(null);

  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  // Ref for member photo file input
  const memberPhotoInputRef = useRef<HTMLInputElement>(null);

  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState<boolean>(false);

  const handleProfileLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert('चित्राचा आकार ८MB पेक्षा कमी असावा.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setCropImageSrc(result);
          setIsCropModalOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Handle member photo change (no cropping for simplicity)
  const handleMemberPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert('चित्राचा आकार ८MB पेक्षा कमी असावा.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          // Update member's photoUrl
          onUpdateMember({ ...currentProfile, photoUrl: result });
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCropComplete = (croppedUrl: string) => {
    if (onUpdateGroupLogo) {
      onUpdateGroupLogo(croppedUrl);
    }
  };

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState(currentProfile.fullName);
  const [editBirthDate, setEditBirthDate] = useState(currentProfile.birthDate || '1992-05-15');
  const [editEmail, setEditEmail] = useState(currentProfile.email || 'moryagroupdata@gmail.com');
  const [editPhone, setEditPhone] = useState(currentProfile.phone || '9822010101');
  const [editAddress, setEditAddress] = useState(currentProfile.address || 'हडपसर गोंधळनगर, पुणे');
  const [editAge, setEditAge] = useState<string>(
    currentProfile.age ? String(currentProfile.age) : '34'
  );
  const [editPassword, setEditPassword] = useState(currentProfile.password || '');
  const [editConfirmPassword, setEditConfirmPassword] = useState(currentProfile.password || '');
  const [passwordMismatchError, setPasswordMismatchError] = useState<string | null>(null);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Helper to calculate age from birthDate
  const handleBirthDateChange = (dateVal: string) => {
    setEditBirthDate(dateVal);
    if (dateVal) {
      const birth = new Date(dateVal);
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let calcAge = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          calcAge--;
        }
        if (calcAge >= 0) {
          setEditAge(String(calcAge));
        }
      }
    }
  };

  const startEdit = () => {
    setEditFullName(currentProfile.fullName);
    setEditBirthDate(currentProfile.birthDate || '1992-05-15');
    setEditEmail(currentProfile.email || 'moryagroupdata@gmail.com');
    setEditPhone(currentProfile.phone || '9822010101');
    setEditAddress(currentProfile.address || 'हडपसर गोंधळनगर, पुणे');
    setEditAge(currentProfile.age ? String(currentProfile.age) : '34');
    setEditPassword(currentProfile.password || '');
    setEditConfirmPassword(currentProfile.password || '');
    setPasswordMismatchError(null);
    setIsEditing(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMismatchError(null);

    if (editPassword.trim() || editConfirmPassword.trim()) {
      if (editPassword.trim() !== editConfirmPassword.trim()) {
        setPasswordMismatchError('पासवर्ड जुळत नाहीत! कृपया दोन्ही पासवर्ड सारखे प्रविष्ट करा.');
        return;
      }
    }

    const updated: Member = {
      ...currentProfile,
      fullName: editFullName.trim(),
      birthDate: editBirthDate,
      email: editEmail.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim(),
      age: parseInt(editAge, 10) || undefined,
      password: editPassword.trim() || undefined,
    };

    onUpdateMember(updated);

    // If editing self, update currentUser as well
    if (currentProfile.fullName.trim() === currentUser.name.trim()) {
      onUpdateCurrentUser({
        ...currentUser,
        name: updated.fullName,
        phone: updated.phone,
        birthDate: updated.birthDate,
        email: updated.email,
        age: updated.age,
      });
    }

    setIsEditing(false);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  // Financial calculations for this member
  const subscriptionPaid = getMemberSubscriptionPaid(currentProfile.id, incomes);
  const donationPaid = getMemberExtraDonationPaid(currentProfile.id, incomes);
  const totalContributed = subscriptionPaid + donationPaid;
  const target = currentProfile.annualTargetAmount || 6000;
  const pendingTarget = Math.max(0, target - subscriptionPaid);

  const formattedBirthDate = currentProfile.birthDate
    ? new Date(currentProfile.birthDate).toLocaleDateString('mr-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'नमुद नाही';

  // Handle switching active login user to selected profile
  const handleSwitchToCurrentProfile = () => {
    const isAdmin = currentUser.role === 'ॲडमिन' && currentUser.isLoggedIn !== false;

    if (isAdmin) {
      onUpdateCurrentUser({
        name: currentProfile.fullName,
        role: (currentProfile.designation as any) || 'सभासद',
        phone: currentProfile.phone,
        email: currentProfile.email,
        birthDate: currentProfile.birthDate,
        age: currentProfile.age,
        isLoggedIn: true,
      });
      return;
    }

    if (currentProfile.password && currentProfile.password.trim() !== '') {
      onOpenLogin(currentProfile.id, 'member');
    } else {
      onUpdateCurrentUser({
        name: currentProfile.fullName,
        role: (currentProfile.designation as any) || 'सभासद',
        phone: currentProfile.phone,
        email: currentProfile.email,
        birthDate: currentProfile.birthDate,
        age: currentProfile.age,
        isLoggedIn: true,
      });
    }
  };

  const isLoggedIn = currentUser.isLoggedIn !== false;

  if (!isLoggedIn) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl max-w-xl mx-auto text-center space-y-5 my-8">
        <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-800">
            वैयक्तिक प्रोफाईल व योगदान सुरक्षित आहे
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            आपली वैयक्तिक माहिती, संपर्क, पत्ता व वर्गणी योगदान पाहण्यासाठी कृपया पासवर्डने लॉगिन करा.
          </p>
        </div>
        <button
          onClick={() => onOpenLogin()}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl shadow-lg inline-flex items-center gap-2 cursor-pointer transition-all"
        >
          <Lock className="w-4 h-4" />
          <span>पासवर्डने लॉगिन करा</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer mb-2 active:scale-95 shrink-0"
          title="मुख्य डॅशबोर्डवर परत जा (Exit)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← मुख्य पानावर जा (Exit)</span>
        </button>
      )}
      {/* Top Banner / Welcome Header */}
      <div className="bg-gradient-to-r from-amber-950 via-rose-950 to-orange-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-amber-500/40">
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Main Member Profile Photo */}
          <div className="relative group shrink-0">
            <div
              onClick={() => setIsPhotoLightboxOpen(true)}
              className="cursor-pointer"
              title="मोठा फोटो पहा (Full Screen View)"
            >
              {currentProfile.photoUrl ? (
                <img
                  src={currentProfile.photoUrl}
                  alt={currentProfile.fullName}
                  className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-full border-4 border-amber-400 shadow-2xl bg-slate-950 p-0.5 transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-amber-400/90 bg-amber-500/20 flex flex-col items-center justify-center text-amber-300 font-black shadow-2xl transition-transform group-hover:scale-105">
                  <User className="w-12 h-12 text-amber-400" />
                  <span className="text-[9px] font-bold text-amber-200 mt-1">मोठा फोटो पहा</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsPhotoLightboxOpen(true)}
              title="मोठा प्रोफाईल फोटो पहा"
              className="absolute top-0 right-0 bg-slate-950/80 text-amber-400 p-1.5 rounded-full border border-slate-700 opacity-90 hover:opacity-100 transition-opacity cursor-pointer shadow-md"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => memberPhotoInputRef.current?.click()}
              title="फोटो बदला / अपलोड करा"
              className="absolute bottom-0 right-0 bg-amber-500 hover:bg-amber-400 text-slate-950 p-1.5 rounded-full border-2 border-slate-900 shadow-xl cursor-pointer transition-transform hover:scale-110"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              type="file"
              ref={memberPhotoInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleMemberPhotoChange}
            />
          </div>


          <div className="text-center sm:text-left flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full font-bold text-xs flex items-center gap-1">
                <Hash className="w-3 h-3" /> {currentProfile.memberCode}
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full font-bold text-xs flex items-center gap-1">
                <Award className="w-3 h-3" /> {currentProfile.designation || 'सभासद'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {currentProfile.fullName}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              मोरया ग्रुप मित्र मंडळ (ट्रस्ट) • हडपसर गोंधळनगर, पुणे
            </p>

            {/* Member selector for admins/users */}
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-xs text-slate-400 font-bold">सभासद प्रोफाईल पहा:</span>
              <select
                value={selectedMemberId}
                onChange={(e) => {
                  const targetId = e.target.value;
                  const targetMember = members.find((m) => m.id === targetId);
                  const isAdmin = currentUser.role === 'ॲडमिन' && currentUser.isLoggedIn !== false;
                  const isSelf = targetMember && targetMember.fullName.trim() === currentUser.name.trim();

                  if (isAdmin || isSelf) {
                    setSelectedMemberId(targetId);
                    setIsEditing(false);
                  } else {
                    // Non-admin attempting to view another member's profile & contribution -> require password!
                    onOpenLogin(targetId, 'member');
                  }
                }}
                className="bg-slate-800 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.designation || 'सभासद'})
                  </option>
                ))}
              </select>

              {currentProfile.fullName !== currentUser.name && (
                <button
                  type="button"
                  onClick={handleSwitchToCurrentProfile}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>या खात्याने लॉगिन करा</span>
                </button>
              )}
            </div>
          </div>

          {!isEditing && (
            <button
              onClick={startEdit}
              className="mt-4 sm:mt-0 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all shrink-0"
            >
              <Edit className="w-4 h-4" />
              <span>माहिती दुरुस्त करा</span>
            </button>
          )}
        </div>
      </div>

      {isSavedNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>प्रोफाइल तपशील यशस्वीरित्या अपडेट करण्यात आले आहेत!</span>
        </div>
      )}

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Details (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-amber-500" />
                <span>व्यक्तिगत माहिती & संपर्क (Personal Profile)</span>
              </h2>
              {isEditing ? (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  ✏️ एडिट मोड सुरू
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-500">
                  माहिती अचूकता तपासा
                </span>
              )}
            </div>

            {isEditing ? (
              /* Editable Profile Form */
              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      पूर्ण नाव (Full Name):
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Mobile No */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      मोबाईल क्रमांक (Mobile No):
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        required
                        placeholder="९८२२०१०१०१"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Birth Date */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      जन्मतारीख (Birth Date):
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        value={editBirthDate}
                        onChange={(e) => handleBirthDateChange(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      वय (Age in Years):
                    </label>
                    <div className="relative">
                      <Cake className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        min="1"
                        max="110"
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        placeholder="३४"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Email ID */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ई-मेल आयडी (Mail ID / Email):
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="example@moryagroup.org"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block font-bold text-amber-900 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      खात्याचा पासवर्ड / PIN:
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-amber-600 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => {
                          setEditPassword(e.target.value);
                          setPasswordMismatchError(null);
                        }}
                        placeholder="नवीन पासवर्ड सेट करा"
                        className="w-full pl-9 pr-3 py-2 border border-amber-300 bg-amber-50/40 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block font-bold text-amber-900 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      पासवर्ड पुन्हा टाका (Re-enter Password):
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-amber-600 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={editConfirmPassword}
                        onChange={(e) => {
                          setEditConfirmPassword(e.target.value);
                          setPasswordMismatchError(null);
                        }}
                        placeholder="पासवर्ड पुन्हा टाइप करा"
                        className="w-full pl-9 pr-3 py-2 border border-amber-300 bg-amber-50/40 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  {passwordMismatchError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold text-xs flex items-center gap-1.5 sm:col-span-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{passwordMismatchError}</span>
                    </div>
                  )}

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      पत्ता (Residential Address):
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <textarea
                        rows={2}
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>माहिती जतन करा (Save Profile)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl cursor-pointer transition-all"
                  >
                    रद्द करा
                  </button>
                </div>
              </form>
            ) : (
              /* Display Profile Fields */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Full Name */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500">पूर्ण नाव</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">
                      {currentProfile.fullName}
                    </p>
                  </div>
                </div>

                {/* Designation */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                  <div className="p-2 bg-purple-100 text-purple-800 rounded-xl shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500">पद / हुद्दा</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">
                      {currentProfile.designation || 'सभासद'}
                    </p>
                  </div>
                </div>

                {/* Birth Date */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                  <div className="p-2 bg-rose-100 text-rose-800 rounded-xl shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500">जन्मतारीख (Birth Date)</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">
                      {formattedBirthDate}
                    </p>
                  </div>
                </div>

                {/* Age */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-800 rounded-xl shrink-0">
                    <Cake className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500">वय (Age)</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">
                      {currentProfile.age ? `${currentProfile.age} वर्षे` : '३४ वर्षे'}
                    </p>
                  </div>
                </div>

                {/* Mobile No */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500">मोबाईल क्रमांक (Mobile No)</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5 font-mono">
                      {currentProfile.phone || '९८२२०१०१०१'}
                    </p>
                  </div>
                </div>

                {/* Mail ID */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                  <div className="p-2 bg-blue-100 text-blue-800 rounded-xl shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[11px] font-bold text-slate-500">ई-मेल आयडी (Mail ID)</p>
                    <p className="text-xs font-black text-slate-900 mt-0.5 truncate">
                      {currentProfile.email || 'moryagroupdata@gmail.com'}
                    </p>
                  </div>
                </div>

                {/* Password Status */}
                <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/60 flex items-start gap-3">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-amber-900">खात्याचा पासवर्ड</p>
                    <p className="text-xs font-mono font-black text-amber-950 mt-0.5">
                      {currentProfile.password ? '•••••••• (सुरक्षित पासवर्ड सेट)' : 'पासवर्ड सेट केलेला नाही'}
                    </p>
                  </div>
                </div>

                {/* Address */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3 sm:col-span-2">
                  <div className="p-2 bg-teal-100 text-teal-800 rounded-xl shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500">निवासी पत्ता (Address)</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {currentProfile.address || 'हडपसर गोंधळनगर, पुणे'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Financial & Subscription Target Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>वार्षिक वर्गणी & योगदान (Contribution)</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-600">वार्षिक वर्गणी लक्ष्य:</span>
                <span className="font-black text-slate-900 text-sm">
                  ₹{target.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="font-bold text-emerald-800">जमा वर्गणी:</span>
                <span className="font-black text-emerald-900 text-sm">
                  ₹{subscriptionPaid.toLocaleString('en-IN')}
                </span>
              </div>

              {donationPaid > 0 && (
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <span className="font-bold text-purple-800">अतिरिक्त देणगी:</span>
                  <span className="font-black text-purple-900 text-sm">
                    ₹{donationPaid.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="font-bold text-amber-900">बाकी वर्गणी:</span>
                <span
                  className={`font-black text-sm ${
                    pendingTarget > 0 ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {pendingTarget > 0
                    ? `₹${pendingTarget.toLocaleString('en-IN')}`
                    : '✅ पूर्ण वर्गणी जमा'}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="pt-2 space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-500">
                <span>लक्ष्य पूर्णता:</span>
                <span>
                  {Math.min(100, Math.round((subscriptionPaid / target) * 100))}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((subscriptionPaid / target) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Admin Group Logo Setting */}
          {isAdmin && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-3 shadow-md">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Camera className="w-5 h-5 text-amber-600" />
                <h3>मंडळ लोगो व्यवस्थापन (ॲडमिन)</h3>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                ॲडमिन म्हणून आपण मंडळाचा अधिकृत लोगो बदलू शकता. हा लोगो ॲपमधील साईडबार, डॅशबोर्ड व लॉगिन विजेट्सवर दिसेल.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => profileLogoInputRef.current?.click()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>नवीन लोगो इमेज अपलोड करा</span>
                </button>

                {groupLogo && (
                  <button
                    type="button"
                    onClick={() => onUpdateGroupLogo && onUpdateGroupLogo('')}
                    className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>मूळ लोगो रिसेट करा</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Login Badge / Auth Info */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <h4 className="font-bold text-xs text-amber-300">
                लॉगिन सुरक्षितता व अधिकार
              </h4>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              सध्या आपण <strong>{currentUser.name}</strong> ({currentUser.role}) खात्याने लॉगिन आहात.
            </p>
            <button
              onClick={() => onOpenLogin?.()}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>खाते बदला किंवा नवीन लॉगिन करा</span>
            </button>
          </div>
        </div>
      </div>

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => setIsCropModalOpen(false)}
        onCropComplete={handleCropComplete}
      />

      {/* WhatsApp Style Logo Lightbox */}
      <LogoLightboxModal
        isOpen={isLightboxOpen}
        logoSrc={groupLogo}
        onClose={() => setIsLightboxOpen(false)}
        isAdmin={isAdmin}
        onChangeLogoClick={() => profileLogoInputRef.current?.click()}
      />

      {/* Hidden File Input for Group Logo */}
      <input
        type="file"
        ref={profileLogoInputRef}
        onChange={handleProfileLogoChange}
        accept="image/*"
        className="hidden"
      />

      {/* Member Profile Photo Lightbox */}
      <ProfilePhotoLightboxModal
        isOpen={isPhotoLightboxOpen}
        onClose={() => setIsPhotoLightboxOpen(false)}
        photoUrl={currentProfile.photoUrl}
        memberName={currentProfile.fullName}
        memberRole={currentProfile.designation}
        memberCode={currentProfile.memberCode}
      />
    </div>
  );
};
