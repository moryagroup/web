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
  ReceiptIndianRupee,
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
  FileDown,
  Calendar,
  Settings,
  Sun,
  Moon,
  Wallet,
  Pin,
  PinOff,
  Menu,
  Vote,
  Smartphone,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;
  members: Member[];
  pendingExpenseCount: number;
  pendingCashSettlementCount?: number;
  pendingPollsCount?: number;
  groupLogo?: string;
  onUpdateGroupLogo?: (logoUrl: string) => void;
  onResetData: () => void;
  onOpenLogin: (memberId?: string, type?: 'admin' | 'member') => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  onOpenOccasions?: () => void;
  onOpenSettings?: () => void;
  disabledFeatures?: string[];
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  setCurrentUser,
  members,
  pendingExpenseCount,
  pendingCashSettlementCount = 0,
  pendingPollsCount = 0,
  groupLogo,
  onUpdateGroupLogo,
  onResetData,
  onOpenLogin,
  onLogout,
  isOpen = false,
  onClose,
  onOpen,
  onOpenOccasions,
  onOpenSettings,
  disabledFeatures = [],
  theme = 'light',
  onToggleTheme,
}) => {
  const isAdmin = hasAdminPermissions(currentUser.role) && currentUser.isLoggedIn !== false;
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  // Auto-draw on hover & pin state management
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem('morya_sidebar_pinned') === 'true';
    } catch {
      return false;
    }
  });

  const handleTogglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    try {
      localStorage.setItem('morya_sidebar_pinned', String(next));
    } catch {
      // ignore
    }
  };

  const isDrawerActive = isPinned || isOpen || isHovered;

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
      icon: ReceiptIndianRupee,
    },
    {
      id: 'expense-history',
      label: 'खर्च इतिहास',
      icon: FileSpreadsheet,
      badge: pendingExpenseCount > 0 ? pendingExpenseCount : null,
    },
    {
      id: 'cash-settlements',
      label: 'रोख संकलन व भरणा हिशोब',
      icon: Wallet,
      color: 'text-emerald-400',
      badge: pendingCashSettlementCount > 0 ? pendingCashSettlementCount : null,
    },
    {
      id: 'member-subscriptions',
      label: 'सभासद वर्गणी हिशोब',
      icon: Users,
    },
    {
      id: 'occasions',
      label: 'उत्सव व्यवस्थापन',
      icon: Calendar,
      color: 'text-amber-400',
    },
    {
      id: 'polls',
      label: 'मतदान व निर्णय',
      icon: Vote,
      color: 'text-amber-400',
      badge: pendingPollsCount > 0 ? pendingPollsCount : null,
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
      id: 'suggestions',
      label: 'सूचना व सुचवणी',
      icon: MessageSquarePlus,
      color: 'text-sky-400',
    },
    {
      id: 'settings',
      label: 'सेटिंग्ज (Settings)',
      icon: Settings,
      color: 'text-slate-400',
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
    // If not admin, hide any feature that is marked as disabled
    if (!isAdmin && disabledFeatures.includes(item.id)) {
      return false;
    }
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
    if (val === 'ADMIN_ACCOUNT') {
      onOpenLogin('ADMIN_ACCOUNT', 'admin');
    } else {
      onOpenLogin(val, 'member');
    }
    onClose?.();
  };

  const selectedValue =
    currentUser.role === 'ॲडमिन'
      ? 'ADMIN_ACCOUNT'
      : members.find((m) => m.fullName === currentUser.name)?.id || 'ADMIN_ACCOUNT';

  return (
    <>
      {/* Drawer Overlay Backdrop (when drawer is active and not pinned) */}
      {!isPinned && isDrawerActive && (
        <div
          onClick={() => {
            setIsHovered(false);
            onClose?.();
          }}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Floating Edge Trigger Handle (visible when drawer is collapsed and unpinned) */}
      {!isPinned && !isDrawerActive && (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onClick={() => {
            if (isOpen) onClose?.();
            else onOpen?.();
          }}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 cursor-pointer group"
          title="मेन्यू उघडा (Hover or Click to Draw Out)"
        >
          <div className="bg-gradient-to-r from-amber-950 to-orange-950 text-amber-300 hover:text-white px-2 py-4 rounded-r-2xl border-y border-r border-amber-500/60 shadow-2xl flex flex-col items-center gap-1.5 transition-all group-hover:scale-105 group-hover:pr-3 group-hover:border-amber-400">
            <Menu className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="[writing-mode:vertical-lr] text-[10px] font-black tracking-widest text-amber-200">
              मेन्यू
            </span>
          </div>
        </div>
      )}

      <aside
        onMouseEnter={() => {
          if (!isPinned) setIsHovered(true);
        }}
        onMouseLeave={() => {
          if (!isPinned) setIsHovered(false);
        }}
        className={`${
          isPinned
            ? 'static translate-x-0 w-64 shrink-0'
            : `fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[300px] sm:w-72 shadow-2xl transition-transform duration-300 ease-in-out ${
                isDrawerActive ? 'translate-x-0' : '-translate-x-full'
              }`
        } bg-gradient-to-b from-[#1C0A00] via-[#2A0E00] to-[#140600] text-white flex flex-col justify-between shrink-0 select-none border-r border-amber-900/60 overflow-y-auto overscroll-contain h-full max-h-[100dvh]`}
      >
        <div>
          {/* Mandal Branding Header */}
          <div className="p-4 pb-3 border-b border-amber-900/60 bg-amber-950/40 flex flex-col items-center text-center relative">
            {/* Header Controls: Pin/Unpin & Close */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleTogglePin}
                className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer flex items-center gap-0.5 ${
                  isPinned
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title={isPinned ? 'पिन काढण्यासाठी क्लिक करा' : 'मेन्यू नेहमी खुला ठेवण्यासाठी पिन करा'}
              >
                {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                <span className="font-black">{isPinned ? 'पिन' : 'ऑटो'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsHovered(false);
                  onClose?.();
                }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer border border-slate-700 active:scale-95 transition-all"
                title="मेन्यू बंद करा"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="relative mb-2 group cursor-pointer"
              onClick={() => setIsLightboxOpen(true)}
              title="मोठा लोगो पहा (Click to View Big Logo)"
            >
              <img
                src={groupLogo || moryaLogo}
                alt="मोरया ग्रुप मित्र मंडळ (ट्रस्ट) लोगो"
                className="w-20 h-20 sm:w-22 sm:h-22 object-contain rounded-full border-2 border-amber-500/90 shadow-lg shadow-orange-900/50 p-0.5 bg-slate-950 transition-transform group-hover:scale-105 cursor-pointer"
              />
              {isAdmin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    logoInputRef.current?.click();
                  }}
                  title="मंडळ लोगो बदला"
                  className="absolute bottom-0 right-0 bg-amber-500 hover:bg-amber-400 text-slate-950 p-1.5 rounded-full border border-slate-900 shadow-md cursor-pointer transition-transform hover:scale-110 flex items-center justify-center z-10"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <input
              type="file"
              ref={logoInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleLogoFileChange}
            />

            <h1
              onClick={() => setIsLightboxOpen(true)}
              className="text-sm sm:text-base font-black text-amber-400 leading-tight tracking-wide px-1 cursor-pointer hover:text-amber-300 transition-colors"
              title="मोठा लोगो व संपूर्ण नाव पहा"
            >
              मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
            </h1>
            <span className="text-xs text-amber-200/90 font-bold block mt-1">
              हडपसर गोंधळनगर, पुणे
            </span>
          </div>

        {/* Navigation Menu */}
        <nav className="px-3 py-2 space-y-1.5 sm:space-y-2 mt-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isProtected = item.id !== 'dashboard' && !isLoggedIn;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'occasions') {
                    if (onOpenOccasions) onOpenOccasions();
                  } else if (item.id === 'settings') {
                    if (onOpenSettings) onOpenSettings();
                  } else if (isProtected) {
                    onOpenLogin();
                  } else {
                    setActiveTab(item.id);
                  }
                  if (!isPinned) {
                    setIsHovered(false);
                    onClose?.();
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-white border-l-4 border-amber-500 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 ${
                      item.color ? item.color : isActive ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.id === 'dashboard' && !isLoggedIn ? '📸 फोटो गॅलरी (Home)' : item.label}</span>
                </div>
                {isAdmin && disabledFeatures.includes(item.id) ? (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded flex items-center gap-1 shrink-0">
                    <Lock className="w-2.5 h-2.5 text-rose-400" />
                    <span>लपवले</span>
                  </span>
                ) : isProtected ? (
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                ) : item.badge ? (
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-slate-950 rounded-full animate-pulse shrink-0">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Theme Toggle & PWA App Button */}
      <div className="px-3 py-2 border-t border-slate-800 bg-slate-900/90 shrink-0 pb-3 space-y-2">
        <button
          onClick={() => {
            if (onClose) onClose();
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(console.warn);
            }
          }}
          className="w-full py-1.5 px-2 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg border border-amber-500/40 text-xs font-bold flex items-center justify-between cursor-pointer transition-all active:scale-95 shadow-xs"
          title="ॲप फुल स्क्रीनमध्ये चालवा (No Address Bar)"
        >
          <span className="flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-amber-400" />
            <span>होम स्क्रीनवर ॲप जोडा</span>
          </span>
          <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.2 font-black rounded">PWA</span>
        </button>

        <div className="px-2 py-1.5 bg-slate-900/90 rounded-lg border border-slate-800 text-slate-300 flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5 text-amber-400">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            <span>थीम मोड</span>
          </span>
          <button
            onClick={onToggleTheme}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
            title={theme === 'dark' ? 'लाइट मोड चालू करा' : 'डार्क मोड चालू करा'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>लाइट</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-300" />
                <span>डार्क</span>
              </>
            )}
          </button>
        </div>
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
