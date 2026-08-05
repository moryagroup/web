import React from 'react';
import { ShieldAlert, Lock, UserCheck, LogIn } from 'lucide-react';

interface RbacGuardProps {
  title?: string;
  message?: string;
  currentRole?: string;
  onLoginClick?: () => void;
}

export const RbacGuard: React.FC<RbacGuardProps> = ({
  title = 'प्रवेश प्रतिबंधित (Access Restricted)',
  message = 'मंडळाच्या सर्वंकष गोपनीय आर्थिक व प्रशासकीय नोंदी पाहण्याची व बदलण्याची परवानगी फक्त अध्यक्ष, खजिनदार, उपखजिनदार आणि ॲडमिन यांनाच आहे.',
  currentRole,
  onLoginClick,
}) => {
  return (
    <div className="my-8 max-w-2xl mx-auto bg-white rounded-3xl p-8 border border-rose-200 shadow-xl text-center space-y-5">
      <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
        <ShieldAlert className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-700 text-xs font-black rounded-full border border-rose-200">
          <Lock className="w-3.5 h-3.5" />
          <span>सुरक्षा नियंत्रण (RBAC)</span>
        </div>
        <h3 className="text-xl font-black text-slate-800">{title}</h3>
        <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          {message}
        </p>
      </div>

      {currentRole && (
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 inline-block font-medium">
          आपले सद्य पद/रोल: <strong className="text-slate-800 font-black">{currentRole}</strong> (अपर्याप्त अधिकार)
        </div>
      )}

      {onLoginClick && (
        <div>
          <button
            onClick={onLoginClick}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg inline-flex items-center gap-2 cursor-pointer transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>अधिकृत खात्याने लॉगिन करा (Login Here)</span>
          </button>
        </div>
      )}

      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5 font-bold text-slate-700">
          <UserCheck className="w-4 h-4 text-emerald-600" /> अधिकृत पदे:
        </span>
        <div className="flex flex-wrap justify-center gap-1.5 font-bold">
          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded">अध्यक्ष</span>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded">खजिनदार</span>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded">उपखजिनदार</span>
          <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded">ॲडमिन</span>
        </div>
      </div>
    </div>
  );
};
