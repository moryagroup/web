import React, { useState } from 'react';
import { OccasionEvent, CurrentUser } from '../types';
import { Calendar, Plus, Edit2, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { hasAdminPermissions } from '../utils/rbac';

interface OccasionModalProps {
  isOpen: boolean;
  onClose: () => void;
  occasions: OccasionEvent[];
  onAddOccasion: (occasion: OccasionEvent) => void;
  onUpdateOccasion: (occasion: OccasionEvent) => void;
  onDeleteOccasion: (id: string) => void;
  currentUser: CurrentUser;
  onOpenLogin?: () => void;
}

export const OccasionModal: React.FC<OccasionModalProps> = ({
  isOpen,
  onClose,
  occasions,
  onAddOccasion,
  onUpdateOccasion,
  onDeleteOccasion,
  currentUser,
  onOpenLogin,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [year, setYear] = useState<string>('२०२६-२७');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const isLoggedIn = currentUser.isLoggedIn !== false;
  const isAdmin = isLoggedIn && hasAdminPermissions(currentUser.role);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setYear('२०२६-२७');
    setStartDate('');
    setEndDate('');
    setDescription('');
    setErrorMessage('');
    setIsFormOpen(false);
  };

  const handleOpenAdd = () => {
    if (!isLoggedIn) {
      if (onOpenLogin) onOpenLogin();
      return;
    }
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (occ: OccasionEvent) => {
    if (!isAdmin) {
      alert('उत्सव/कार्यक्रम संपादित करण्याचे अधिकार ॲडमिन यांनाच आहेत.');
      if (onOpenLogin) onOpenLogin();
      return;
    }
    setEditingId(occ.id);
    setName(occ.name);
    setYear(occ.year || '२०२६-२७');
    setStartDate(occ.startDate || '');
    setEndDate(occ.endDate || '');
    setDescription(occ.description || '');
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) {
      alert('उत्सव/कार्यक्रम हटवण्याचे अधिकार ॲडमिन यांनाच आहेत.');
      if (onOpenLogin) onOpenLogin();
      return;
    }
    if (window.confirm('तुम्हाला खरोखर हा उत्सव/कार्यक्रम हटवायचा आहे का?')) {
      onDeleteOccasion(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('कृपया उत्सवाचे नाव प्रविष्ट करा.');
      return;
    }

    if (editingId) {
      const updated: OccasionEvent = {
        id: editingId,
        name: name.trim(),
        year: year.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        description: description.trim() || undefined,
      };
      onUpdateOccasion(updated);
    } else {
      const newOccasion: OccasionEvent = {
        id: 'occ-' + Date.now(),
        name: name.trim(),
        year: year.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        description: description.trim() || undefined,
      };
      onAddOccasion(newOccasion);
    }

    resetForm();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">उत्सव व कार्यक्रम व्यवस्थापन</h3>
              <p className="text-[11px] text-slate-400">
                मंडळाचे सर्व वार्षिक व विशेष कार्यक्रम व्यवस्थापित करा ({occasions.length} नोंदी)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Section (Add / Edit) */}
          {isFormOpen ? (
            <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <h4 className="font-bold text-slate-800 text-xs">
                  {editingId ? 'उत्सव/कार्यक्रम अद्ययावत करा' : '+ नवीन उत्सव/कार्यक्रम जोडा'}
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-slate-500 hover:text-slate-700 font-bold"
                >
                  रद्द करा
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    उत्सवाचे / कार्यक्रमाचे नाव <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="उदा. गणेशोत्सव २०२६ / शिवजयंती उत्सव"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    आर्थिक वर्ष (Financial Year)
                  </label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="उदा. २०२६-२७"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    सुरुवात तारीख (Start Date)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    समाप्ती तारीख (End Date)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  वर्णन / तपशील (Description)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="उदा. १० दिवस गणेशोत्सव भव्य महाप्रसाद व सांस्कृतिक कार्यक्रम"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'साठवा (Save)' : 'जोडा (Add)'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold">सर्व नोंदणीकृत उत्सव ({occasions.length}):</span>
              <button
                onClick={handleOpenAdd}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ नवीन उत्सव जोडा</span>
              </button>
            </div>
          )}

          {/* Occasions List */}
          <div className="space-y-2.5">
            {occasions.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-500">कोणतेही उत्सव नोंदणीकृत नाहीत.</p>
              </div>
            ) : (
              occasions.map((occ) => (
                <div
                  key={occ.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-amber-400 transition-colors flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-800 text-xs">{occ.name}</h4>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-md text-[10px]">
                        वर्ष: {occ.year}
                      </span>
                    </div>
                    {occ.description && (
                      <p className="text-[11px] text-slate-500">{occ.description}</p>
                    )}
                    {(occ.startDate || occ.endDate) && (
                      <p className="text-[10px] text-slate-400">
                        कालावधी: {occ.startDate || '—'} ते {occ.endDate || '—'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(occ)}
                      className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      title="संपादित करा"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(occ.id)}
                      className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="हटवा"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            बंद करा (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
