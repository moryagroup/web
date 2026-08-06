import React, { useRef, useState } from 'react';
import { CurrentUser, Member } from '../types';
import moryaLogo from '../assets/morya_logo.jpg';
import { hasFullFinancialAccess, hasAdminPermissions, isBadgedMember, isCoreMemberRole } from '../utils/rbac';
import { ImageCropModal } from './ImageCropModal';
import { LogoLightboxModal } from './LogoLightboxModal';
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
  Users,
  RotateCcw,
  ShieldCheck,
  Lock,
  LogIn,
  LogOut,
  UserCheck,
  Camera,
  Upload,
  Maximize2,
  X,
  CalendarRange,
  History,
  PieChart,
  MessageSquarePlus,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;
  members: Member[];
  pendingExpenseCount: number;
  groupLogo?: string;
  onUpdateGroupLogo?: (logoUrl: string) => void;
  onResetData: () => void;
  onOpenLogin: (memberId?: string, type?: 'admin' | 'member') => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  setCurrentUser,
  members,
  pendingExpenseCount,
  groupLogo,
  onUpdateGroupLogo,
  onResetData,
  onOpenLogin,
  onLogout,
  isOpen = false,
  onClose,
}) => {
  const isAdmin = hasAdminPermissions(currentUser.role) && currentUser.isLoggedIn !== false;
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    // reset file input
    e.target.value = '';
  };

  const handleCropComplete = (croppedUrl: string) => {
    if (onUpdateGroupLogo) {
      onUpdateGroupLogo(croppedUrl);
    }
  };
  const menuItems = [
    {
      id: 'dashboard',
      label: 'डॅशबोर्ड',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'income-form',
      label: 'नवीन जमा नोंद',
      icon: ArrowDownLeft,
      color: 'text-emerald-400',
    },
    {
      id: 'expense-form',
      label: 'नवीन खर्च नोंद',
      icon: ArrowUpRight,
      color: 'text-rose-400',
    },
    {
      id: 'income-history',
      label: 'जमा इतिहास',
      icon: Receipt,
    },
    {
      id: 'expense-history',
      label: 'खर्च इतिहास',
      icon: FileSpreadsheet,
      badge: pendingExpenseCount > 0 ? pendingExpenseCount : null,
    },
    {
      id: 'member-subscriptions',
      label: 'सभासद वर्गणी हिशोब',
      icon: Users,
    },
    {
      id: 'month-wise-reports',
      label: '१. महिन्यानिहाय व्यवहार',
      icon: CalendarRange,
      color: 'text-amber-400',
      isCoreOnly: true,
    },
    {
      id: 'all-years-data',
      label: '२. सर्व वर्षांचा हिशोब',
      icon: History,
      color: 'text-indigo-400',
      isCoreOnly: true,
    },
    {
      id: 'core-summary',
      label: '३. जमा, खर्च व शिल्लक',
      icon: PieChart,
      color: 'text-emerald-400',
      isCoreOnly: true,
    },
    {
      id: 'suggestions',
      label: 'सूचना व सुचवणी',
      icon: MessageSquarePlus,
      color: 'text-sky-400',
    },
    {
      id: 'profile',
      label: 'माझे प्रोफाइल (Profile)',
      icon: UserCheck,
      color: 'text-amber-400',
    },
  ];

  const isLoggedIn = currentUser.isLoggedIn !== false;
  const canSeeSubscriptions = isBadgedMember(currentUser.role) && isLoggedIn;
  const isCoreMember = isLoggedIn && isCoreMemberRole(currentUser.role);

  const visibleMenuItems = menuItems.filter((item) => {
    if (!isLoggedIn) {
      if (item.id !== 'dashboard' && item.id !== 'profile') {
        return false;
      }
    }
    if (item.id === 'member-subscriptions' && !canSeeSubscriptions) {
      return false;
    }
    if (item.isCoreOnly && !isCoreMember) {
      return false;
    }
    return true;
  });

  const handleUserSelect = (val: string) => {
    const isAdmin = currentUser.role === 'ॲडमिन' && currentUser.isLoggedIn !== false;

    if (isAdmin) {
      if (val === 'ADMIN_ACCOUNT') {
        setCurrentUser({
          name: 'सिस्टम ॲडमिन',
          role: 'ॲडमिन',
          phone: '९८२२०१०१००',
          isLoggedIn: true,
        });
        onClose?.();
        return;
      }

      const foundMember = members.find((m) => m.id === val);
      if (foundMember) {
        setCurrentUser({
          name: foundMember.fullName,
          role: (foundMember.designation as any) || 'सभासद',
          phone: foundMember.phone,
          email: foundMember.email,
          birthDate: foundMember.birthDate,
          age: foundMember.age,
          isLoggedIn: true,
        });
      }
      onClose?.();
      return;
    }

    if (val === 'ADMIN_ACCOUNT') {
      onOpenLogin('ADMIN_ACCOUNT', 'admin');
      onClose?.();
      return;
    }

    const foundMember = members.find((m) => m.id === val);
    if (foundMember) {
      if (foundMember.password && foundMember.password.trim() !== '') {
        onOpenLogin(foundMember.id, 'member');
      } else {
        setCurrentUser({
          name: foundMember.fullName,
          role: (foundMember.designation as any) || 'सभासद',
          phone: foundMember.phone,
          email: foundMember.email,
          birthDate: foundMember.birthDate,
          age: foundMember.age,
          isLoggedIn: true,
        });
      }
    }
    onClose?.();
  };

  const selectedValue =
    currentUser.role === 'ॲडमिन'
      ? 'ADMIN_ACCOUNT'
      : members.find((m) => m.fullName === currentUser.name)?.id || 'ADMIN_ACCOUNT';

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[300px] sm:w-72 bg-[#0F172A] text-white flex flex-col justify-between shrink-0 select-none border-r border-slate-800 transition-transform duration-300 ease-in-out overflow-y-auto overscroll-contain h-full max-h-[100dvh] lg:static lg:translate-x-0 lg:w-64 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Mandal Branding Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-col items-center text-center relative">
            {/* Mobile Close Drawer Button */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white lg:hidden cursor-pointer border border-slate-700 active:scale-95 transition-all"
                title="मेन्यू बंद करा"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          <div className="relative mb-2 group">
            <img
              src={groupLogo || moryaLogo}
              alt="मोरया ग्रुप मित्र मंडळ (ट्रस्ट) लोगो"
              onClick={() => setIsLightboxOpen(true)}
              title="मोठा लोगो पहा (WhatsApp Style)"
              className="w-20 h-20 object-contain rounded-full border-2 border-amber-500/90 shadow-lg shadow-orange-900/50 p-0.5 bg-slate-950 transition-transform group-hover:scale-105 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              title="मोठा लोगो पहा"
              className="absolute top-0 right-0 bg-slate-900/80 hover:bg-slate-800 text-amber-400 p-1 rounded-full border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                title="मंडळ लोगो बदला (ॲडमिन - क्रॉप पर्यायासह)"
                className="absolute bottom-0 right-0 bg-amber-500 hover:bg-amber-400 text-slate-950 p-1.5 rounded-full border border-slate-900 shadow-md cursor-pointer transition-transform hover:scale-110 flex items-center justify-center"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20"
              >
                <Upload className="w-3 h-3" />
                <span>लोगो बदला</span>
              </button>
              {groupLogo && (
                <button
                  type="button"
                  onClick={() => onUpdateGroupLogo && onUpdateGroupLogo('')}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer transition-colors px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20"
                  title="मूळ लोगो रिसेट करा"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>रिसेट</span>
                </button>
              )}
            </div>
          )}

          <input
            type="file"
            ref={logoInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleLogoFileChange}
          />

          <h1 className="text-sm font-black text-amber-400 leading-snug tracking-wide">
            मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
          </h1>
          <p className="text-[10px] text-orange-200/90 font-bold mt-0.5">
            हडपसर गोंधळनगर
          </p>
          <span className="mt-1 px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-[9px] font-medium border border-slate-700">
            आर्थिक जमा व खर्च व्यवस्थापन
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1.5 mt-2">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isProtected = item.id !== 'dashboard' && !isLoggedIn;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isProtected) {
                    onOpenLogin();
                  } else {
                    setActiveTab(item.id);
                  }
                  onClose?.();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold border-l-4 border-orange-500 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 ${
                      item.color ? item.color : isActive ? 'text-orange-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.id === 'dashboard' && !isLoggedIn ? '📸 फोटो गॅलरी (Home)' : item.label}</span>
                </div>
                {isProtected ? (
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                ) : item.badge ? (
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-slate-950 rounded-full animate-pulse">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Current Authorized User Info & Login/Logout Control */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90 space-y-3 shrink-0 pb-14 sm:pb-8">
        {isLoggedIn ? (
          <>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> प्रोफाइल / पद बदलावा:
              </span>
            </div>

            <select
              value={selectedValue}
              onChange={(e) => handleUserSelect(e.target.value)}
              className="w-full bg-slate-800 text-slate-100 text-xs font-bold rounded-xl border border-slate-700 p-2 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ADMIN_ACCOUNT">⚡ ॲडमिन (सिस्टम ॲडमिन)</option>

              <optgroup label="पदाधिकारी (Office Bearers)">
                {members
                  .filter((m) => m.designation && m.designation !== 'सभासद')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      🏅 {m.fullName} ({m.designation})
                    </option>
                  ))}
              </optgroup>

              <optgroup label="सभासद (General Members)">
                {members
                  .filter((m) => !m.designation || m.designation === 'सभासद')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      👤 {m.fullName} (सभासद)
                    </option>
                  ))}
              </optgroup>
            </select>

            <div className="p-2.5 bg-slate-800/90 rounded-xl border border-slate-700/80 space-y-2">
              <div
                onClick={() => {
                  setActiveTab('profile');
                  onClose?.();
                }}
                className="flex items-center gap-2 overflow-hidden cursor-pointer hover:bg-slate-700/50 p-1 rounded-lg transition-colors"
                title="प्रोफाइल पहा"
              >
                <div className="w-8 h-8 bg-amber-500 text-slate-950 font-black rounded-lg flex items-center justify-center text-xs shadow shrink-0">
                  {currentUser.name.substring(0, 2)}
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                  <span className="text-[10px] text-amber-300 font-bold px-1.5 py-0.2 bg-slate-900 rounded">
                    {currentUser.role}
                  </span>
                </div>
                <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
              </div>

              <button
                onClick={() => {
                  onLogout();
                  onClose?.();
                }}
                className="w-full py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-bold text-xs rounded-lg border border-rose-700/50 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-300" />
                <span>लॉगआउट (Logout)</span>
              </button>
            </div>
          </>
        ) : (
          <div className="p-3 bg-slate-800/90 rounded-xl border border-amber-500/40 text-center space-y-2">
            <p className="text-xs text-amber-300 font-bold flex items-center justify-center gap-1">
              <Lock className="w-3.5 h-3.5" /> पाहुणा मोड (Guest Mode)
            </p>
            <p className="text-[10px] text-slate-400">
              आर्थिक नोंदी व हिशोब पाहण्यासाठी लॉगिन करा.
            </p>
            <button
              onClick={() => {
                onOpenLogin();
                onClose?.();
              }}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>लॉगिन करा (Login)</span>
            </button>
          </div>
        )}

        <button
          onClick={() => {
            onResetData();
            onClose?.();
          }}
          className="w-full pt-1 flex items-center justify-center gap-1.5 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded transition-colors"
          title="डेमो डेटा रिसेट करा"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>डेटा रिसेट करा</span>
        </button>
      </div>

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => setIsCropModalOpen(false)}
        onCropComplete={handleCropComplete}
      />

      {/* WhatsApp-Style Full Size Logo Lightbox */}
      <LogoLightboxModal
        isOpen={isLightboxOpen}
        logoSrc={groupLogo}
        onClose={() => setIsLightboxOpen(false)}
        isAdmin={isAdmin}
        onChangeLogoClick={() => logoInputRef.current?.click()}
      />
    </aside>
  </>
);
};
