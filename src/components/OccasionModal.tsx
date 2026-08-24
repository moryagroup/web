import React, { useState } from 'react';
import { OccasionEvent, EventTask, TaskStatus, Member, CurrentUser } from '../types';
import { Calendar, Plus, Edit2, Trash2, X, Check, AlertCircle, CheckCircle2, UserCheck, ListChecks, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { hasAdminPermissions, isBadgedMember, sortMembersByDesignation } from '../utils/rbac';
import { TaskObstacleModal } from './TaskObstacleModal';

interface OccasionModalProps {
  isOpen: boolean;
  onClose: () => void;
  occasions: OccasionEvent[];
  members?: Member[];
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
  members = [],
  onAddOccasion,
  onUpdateOccasion,
  onDeleteOccasion,
  currentUser,
  onOpenLogin,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [year, setYear] = useState<string>('२०२६');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [workDetails, setWorkDetails] = useState<string>('');
  const [responsiblePerson, setResponsiblePerson] = useState<string>('');
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Task Pop-up Sub-Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [modalTaskTitle, setModalTaskTitle] = useState<string>('');
  const [modalAssignedMemberId, setModalAssignedMemberId] = useState<string>('');
  const [modalStatus, setModalStatus] = useState<TaskStatus>('प्रलंबित');
  const [modalTeamMembers, setModalTeamMembers] = useState<any[]>([]);
  const [taskModalError, setTaskModalError] = useState<string>('');

  // Active Task Obstacle/Progress Modal State
  const [activeTaskModal, setActiveTaskModal] = useState<{ task: EventTask; occasion: OccasionEvent } | null>(null);

  const isLoggedIn = currentUser.isLoggedIn !== false;
  const isAdmin = isLoggedIn && hasAdminPermissions(currentUser.role);
  const isCommitteeMember = isLoggedIn && (hasAdminPermissions(currentUser.role) || isBadgedMember(currentUser.role));

  if (!isOpen) return null;

  const handleAddTaskRow = () => {
    const defaultMember = members[0];
    const newTask: EventTask = {
      id: 'task-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      taskTitle: '',
      assignedMemberId: defaultMember?.id || '',
      assignedMemberName: defaultMember?.fullName || '',
      assignedMemberRole: defaultMember?.designation || 'सभासद',
      assignedMemberPhone: defaultMember?.phone || '',
      status: 'प्रलंबित',
    };
    setTasks((prev) => [...prev, newTask]);
  };

  const handleUpdateTaskRow = (id: string, field: keyof EventTask, value: any) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (field === 'assignedMemberId') {
          const selectedM = members.find((mem) => mem.id === value);
          return {
            ...t,
            assignedMemberId: value,
            assignedMemberName: selectedM ? selectedM.fullName : '',
            assignedMemberRole: selectedM ? selectedM.designation || 'सभासद' : '',
            assignedMemberPhone: selectedM ? selectedM.phone || '' : '',
          };
        }
        return { ...t, [field]: value };
      })
    );
  };

  const handleRemoveTaskRow = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddTeamMemberToTask = (taskId: string, memberId: string) => {
    if (!memberId) return;
    const selectedM = members.find((mem) => mem.id === memberId);
    if (!selectedM) return;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const currentTeam = t.teamMembers || [];
        if (currentTeam.some((tm) => tm.id === selectedM.id)) return t;
        const newTeamMember = {
          id: selectedM.id,
          name: selectedM.fullName,
          role: selectedM.designation || 'सभासद',
          phone: selectedM.phone || '',
        };
        return { ...t, teamMembers: [...currentTeam, newTeamMember] };
      })
    );
  };

  const handleRemoveTeamMemberFromTask = (taskId: string, memberId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const currentTeam = t.teamMembers || [];
        return { ...t, teamMembers: currentTeam.filter((tm) => tm.id !== memberId) };
      })
    );
  };

  // Task Sub-Modal Handlers
  const handleOpenAddTaskModal = () => {
    setEditingTaskId(null);
    setModalTaskTitle('');
    const defaultM = members[0];
    setModalAssignedMemberId(defaultM?.id || '');
    setModalStatus('प्रलंबित');
    setModalTeamMembers([]);
    setTaskModalError('');
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTaskModal = (task: EventTask) => {
    setEditingTaskId(task.id);
    setModalTaskTitle(task.taskTitle);
    setModalAssignedMemberId(task.assignedMemberId || members[0]?.id || '');
    setModalStatus(task.status || 'प्रलंबित');
    setModalTeamMembers(task.teamMembers ? [...task.teamMembers] : []);
    setTaskModalError('');
    setIsTaskModalOpen(true);
  };

  const handleAddTeamMemberToModal = (memberId: string) => {
    if (!memberId) return;
    const selectedM = members.find((mem) => mem.id === memberId);
    if (!selectedM) return;
    if (modalTeamMembers.some((tm) => tm.id === selectedM.id)) return;
    setModalTeamMembers((prev) => [
      ...prev,
      {
        id: selectedM.id,
        name: selectedM.fullName,
        role: selectedM.designation || 'सभासद',
        phone: selectedM.phone || '',
      },
    ]);
  };

  const handleRemoveTeamMemberFromModal = (memberId: string) => {
    setModalTeamMembers((prev) => prev.filter((tm) => tm.id !== memberId));
  };

  const handleSaveTaskFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTaskTitle.trim()) {
      setTaskModalError('कृपया कामाचे नाव / जबाबदारी प्रविष्ट करा.');
      return;
    }

    const selectedLead = members.find((m) => m.id === modalAssignedMemberId) || members[0];

    if (editingTaskId) {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== editingTaskId) return t;
          return {
            ...t,
            taskTitle: modalTaskTitle.trim(),
            assignedMemberId: selectedLead?.id || '',
            assignedMemberName: selectedLead?.fullName || '',
            assignedMemberRole: selectedLead?.designation || 'सभासद',
            assignedMemberPhone: selectedLead?.phone || '',
            status: modalStatus,
            teamMembers: modalTeamMembers,
          };
        })
      );
    } else {
      const newTask: EventTask = {
        id: 'task-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        taskTitle: modalTaskTitle.trim(),
        assignedMemberId: selectedLead?.id || '',
        assignedMemberName: selectedLead?.fullName || '',
        assignedMemberRole: selectedLead?.designation || 'सभासद',
        assignedMemberPhone: selectedLead?.phone || '',
        status: modalStatus,
        teamMembers: modalTeamMembers,
      };
      setTasks((prev) => [...prev, newTask]);
    }

    setIsTaskModalOpen(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setYear('२०२६');
    setStartDate('');
    setEndDate('');
    setDescription('');
    setWorkDetails('');
    setResponsiblePerson('');
    setTasks([]);
    setErrorMessage('');
    setIsFormOpen(false);
  };

  const handleOpenAdd = () => {
    if (!isLoggedIn) {
      if (onOpenLogin) onOpenLogin();
      return;
    }
    if (!isCommitteeMember) {
      alert('उत्सव/कार्यक्रम व काम जोडण्याचे अधिकार कमिटी सदस्यांना (पदाधिकारी) आहेत.');
      return;
    }
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (occ: OccasionEvent) => {
    if (!isCommitteeMember) {
      alert('उत्सव/कार्यक्रम व काम संपादित करण्याचे अधिकार कमिटी सदस्यांना (पदाधिकारी) आहेत.');
      if (onOpenLogin) onOpenLogin();
      return;
    }
    setEditingId(occ.id);
    setName(occ.name);
    setYear(occ.year || '२०२६');
    setStartDate(occ.startDate || '');
    setEndDate(occ.endDate || '');
    setDescription(occ.description || '');
    setWorkDetails(occ.workDetails || '');
    setResponsiblePerson(occ.responsiblePerson || '');
    setTasks(Array.isArray(occ.tasks) ? occ.tasks : []);
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const handleUpdateTaskFromModal = (updatedTask: EventTask) => {
    if (!activeTaskModal) return;
    const currentOcc = activeTaskModal.occasion;
    const updatedTasksList = (currentOcc.tasks || []).map((t) => (t.id === updatedTask.id ? updatedTask : t));
    const updatedOccasion: OccasionEvent = {
      ...currentOcc,
      tasks: updatedTasksList,
    };
    onUpdateOccasion(updatedOccasion);
    setActiveTaskModal({ task: updatedTask, occasion: updatedOccasion });
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

    const validTasks = tasks.filter((t) => t.taskTitle.trim() !== '');

    if (editingId) {
      const updated: OccasionEvent = {
        id: editingId,
        name: name.trim(),
        year: year.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        description: description.trim() || undefined,
        workDetails: workDetails.trim() || undefined,
        responsiblePerson: responsiblePerson.trim() || undefined,
        tasks: validTasks.length > 0 ? validTasks : undefined,
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
        workDetails: workDetails.trim() || undefined,
        responsiblePerson: responsiblePerson.trim() || undefined,
        tasks: validTasks.length > 0 ? validTasks : undefined,
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
              <div className="flex justify-between items-center border-b border-slate-200 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800 text-xs">
                    {editingId ? 'उत्सव/कार्यक्रम अद्ययावत करा' : '+ नवीन उत्सव/कार्यक्रम जोडा'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsFormCollapsed((prev) => !prev)}
                    className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-md font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                    title="उत्सव माहिती फॉर्म लपवा / दाखवा"
                  >
                    {isFormCollapsed ? (
                      <>
                        <Eye className="w-3 h-3 text-amber-700" />
                        <span>👁️ माहिती दाखवा</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 text-amber-700" />
                        <span>👁️ माहिती लपवा</span>
                      </>
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-slate-500 hover:text-slate-700 font-bold"
                >
                  रद्द करा
                </button>
              </div>

              {isFormCollapsed ? (
                <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between text-[11px] font-bold text-amber-950 shadow-xs">
                  <span>📌 {name || 'नवीन उत्सव'} ({year})</span>
                  <span className="text-[10px] text-amber-800 font-medium">माहिती फॉर्म लपवला आहे</span>
                </div>
              ) : (
                <>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">
                        कामाचे स्वरूप / जबाबदारी (Work Details)
                      </label>
                      <input
                        type="text"
                        value={workDetails}
                        onChange={(e) => setWorkDetails(e.target.value)}
                        placeholder="उदा. मंडप सजावट, ध्वनी व प्रकाश, भोजन नियोजन"
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">
                        प्रमुख / जबाबदार व्यक्ती (Responsible Manager)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) setResponsiblePerson(e.target.value);
                          }}
                          className="p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white cursor-pointer"
                        >
                          <option value="">-- सभासद निवडा --</option>
                          {sortMembersByDesignation(members).map((m) => (
                            <option key={m.id} value={m.fullName}>
                              {m.memberCode} - {m.fullName} ({m.designation || 'सभासद'})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={responsiblePerson}
                          onChange={(e) => setResponsiblePerson(e.target.value)}
                          placeholder="किंवा नाव टाईप करा (उदा. किशोर गर्दी)"
                          className="flex-1 p-2 border border-slate-300 rounded-lg font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Multiple Event Tasks & Manager Assignment */}
              <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-2">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <label className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                    <ListChecks className="w-4 h-4 text-amber-600" />
                    <span>उत्सवातील विविध कामे व जबाबदार सभासद ({tasks.length} कामे)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenAddTaskModal}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ काम/जबाबदारी जोडा</span>
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <p className="text-[11px] text-amber-700 italic text-center py-2.5 bg-white/70 rounded-lg border border-dashed border-amber-200">
                    या उत्सवासाठी अद्याप कोणतीही कामे जोडलेली नाहीत. वर '+ काम/जबाबदारी जोडा' बटणावर क्लिक करून नवीन पॉप-अप खिडकीमध्ये (Pop-up Window) काम जोडा.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task, idx) => (
                      <div
                        key={task.id}
                        className="bg-white p-2.5 rounded-lg border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-800">#{idx + 1} {task.taskTitle}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                task.status === 'पूर्ण'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : task.status === 'प्रक्रियेत'
                                  ? 'bg-blue-100 text-blue-800'
                                  : task.status === 'अडचण / समस्या'
                                  ? 'bg-rose-100 text-rose-800 font-black animate-pulse'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {task.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-amber-900 font-bold flex flex-wrap items-center gap-2">
                            <span>👑 प्रमुख: {task.assignedMemberName} ({task.assignedMemberRole || 'सभासद'})</span>
                            {task.teamMembers && task.teamMembers.length > 0 && (
                              <div className="flex flex-wrap gap-1 items-center">
                                <span className="text-slate-500 font-normal">| 👥 टीम:</span>
                                {task.teamMembers.map((tm) => (
                                  <span key={tm.id} className="px-1.5 py-0.2 bg-amber-100 text-amber-950 rounded text-[9px]">
                                    {tm.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditTaskModal(task)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-md cursor-pointer"
                            title="काम संपादित करा (Edit Task)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveTaskRow(task.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                            title="काम काढून टाका"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-slate-800 text-xs">{occ.name}</h4>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-md text-[10px]">
                        वर्ष: {occ.year}
                      </span>
                      {occ.tasks && occ.tasks.length > 0 && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-300 font-bold rounded-md text-[10px]">
                          {occ.tasks.length} नियोजित कामे
                        </span>
                      )}
                    </div>
                    {occ.description && (
                      <p className="text-[11px] text-slate-500">{occ.description}</p>
                    )}
                    {(occ.workDetails || occ.responsiblePerson) && (
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        {occ.workDetails && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-bold">
                            काम/जबाबदारी: {occ.workDetails}
                          </span>
                        )}
                        {occ.responsiblePerson && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-900 border border-purple-200 rounded font-bold">
                            प्रमुख/व्यवस्थापक: {occ.responsiblePerson}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Render Tasks List if any */}
                    {occ.tasks && occ.tasks.length > 0 && (
                      <div className="pt-2 space-y-1.5">
                        <p className="text-[11px] font-black text-amber-900 flex items-center justify-between">
                          <span>📌 नियोजित कामे व जबाबदार प्रमुख ({occ.tasks.length}):</span>
                          <span className="text-[10px] font-normal text-slate-500">कामावर क्लिक करून प्रगती पहा किंवा नोंदवा</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {occ.tasks.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => setActiveTaskModal({ task: t, occasion: occ })}
                              className="p-2.5 bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-1.5 group"
                              title="कामाची प्रगती पहा व नवीन नोंदवा"
                            >
                              <div className="space-y-1">
                                <div className="flex justify-between items-start gap-1">
                                  <span className="font-extrabold text-slate-900 group-hover:text-amber-800 text-xs">{t.taskTitle}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
                                      t.status === 'पूर्ण'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : t.status === 'प्रक्रियेत'
                                        ? 'bg-blue-100 text-blue-800'
                                        : t.status === 'अडचण / समस्या'
                                        ? 'bg-rose-100 text-rose-800 animate-pulse font-black'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {t.status}
                                  </span>
                                </div>

                                <div className="text-[10px] text-slate-600 font-medium">
                                  <span className="font-bold text-amber-900">👑 प्रमुख:</span> {t.assignedMemberName} ({t.assignedMemberRole || 'सभासद'})
                                </div>

                                {t.teamMembers && t.teamMembers.length > 0 && (
                                  <div className="flex flex-wrap gap-1 items-center pt-0.5">
                                    <span className="text-[9px] font-bold text-slate-500">👥 टीम:</span>
                                    {t.teamMembers.map((tm) => (
                                      <span
                                        key={tm.id}
                                        className="px-1.5 py-0.2 bg-amber-50 text-amber-950 border border-amber-200 rounded text-[9px] font-bold"
                                      >
                                        {tm.name}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Latest Progress Note Banner */}
                                {t.progressUpdates && t.progressUpdates.length > 0 && (
                                  <div className="mt-1 p-1.5 bg-blue-50/90 border border-blue-200 rounded-lg text-[10px] text-blue-950 font-bold space-y-0.5">
                                    <div className="flex items-center justify-between text-[9px] text-blue-800">
                                      <span>🔄 नवीनतम प्रगती:</span>
                                      <span className="text-slate-400 font-normal">{t.progressUpdates[0].createdAt}</span>
                                    </div>
                                    <p className="italic text-[10px] text-slate-800 font-bold">"{t.progressUpdates[0].progressNote}"</p>
                                  </div>
                                )}
                              </div>

                              <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-blue-700 font-bold group-hover:text-blue-900">
                                <span className="flex items-center gap-1">
                                  💬 प्रगती पहा व नोंदवा {(t.progressUpdates?.length || 0) > 0 ? `(${t.progressUpdates?.length})` : ''}
                                </span>
                                <span className="text-[9px] text-slate-400">क्लिक करा →</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(occ.startDate || occ.endDate) && (
                      <p className="text-[10px] text-slate-400">
                        कालावधी: {occ.startDate || '—'} ते {occ.endDate || '—'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {(isCommitteeMember || isAdmin) && (
                      <button
                        onClick={() => handleOpenEdit(occ)}
                        className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="उत्सव व कामे संपादित करा"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(occ.id)}
                        className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="हटवा"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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

      {/* Task Creation / Editing Pop-up Sub-Modal Window */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-xs text-white">
                  {editingTaskId ? 'काम / जबाबदारी अद्ययावत करा' : '+ नवीन काम / जबाबदारी जोडा'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTaskFromModal} className="p-4 space-y-3 text-xs">
              {taskModalError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[11px] font-bold">
                  {taskModalError}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  कामाचे नाव / जबाबदारी <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={modalTaskTitle}
                  onChange={(e) => {
                    setModalTaskTitle(e.target.value);
                    setTaskModalError('');
                  }}
                  placeholder="उदा. मंडप सजावट / ध्वनी व प्रकाश / महाप्रसाद वितरण"
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  प्रमुख व्यवस्थापक (Lead Manager)
                </label>
                <select
                  value={modalAssignedMemberId}
                  onChange={(e) => setModalAssignedMemberId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white cursor-pointer"
                >
                  {sortMembersByDesignation(members).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.memberCode} - {m.fullName} ({m.designation || 'सभासद'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  स्थिती (Status)
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as TaskStatus)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white cursor-pointer"
                >
                  <option value="प्रलंबित">⏳ प्रलंबित</option>
                  <option value="प्रक्रियेत">🔄 प्रक्रियेत</option>
                  <option value="पूर्ण">✓ पूर्ण</option>
                  <option value="अडचण / समस्या">⚠️ अडचण / समस्या</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  सहकार्यकारी सभासद / टीम सदस्य (Team Members)
                </label>
                <div className="flex gap-2">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddTeamMemberToModal(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="">+ टीम सदस्य निवडा...</option>
                    {sortMembersByDesignation(members)
                      .filter(
                        (m) =>
                          m.id !== modalAssignedMemberId &&
                          !modalTeamMembers.some((tm) => tm.id === m.id)
                      )
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.memberCode} - {m.fullName} ({m.designation || 'सभासद'})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                  {modalTeamMembers.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic">कोणतेही अतिरिक्त टीम सदस्य जोडलेले नाहीत.</span>
                  ) : (
                    modalTeamMembers.map((tm) => (
                      <span
                        key={tm.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-950 border border-amber-300 rounded-md text-[10px] font-bold"
                      >
                        <span>👤 {tm.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamMemberFromModal(tm.id)}
                          className="text-amber-800 hover:text-rose-700 font-bold ml-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingTaskId ? 'साठवा (Save)' : 'जोडा (Add Task)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Task Progress & Details Modal Overlay */}
      {activeTaskModal && (
        <TaskObstacleModal
          isOpen={true}
          onClose={() => setActiveTaskModal(null)}
          task={activeTaskModal.task}
          occasion={activeTaskModal.occasion}
          currentUser={currentUser}
          onUpdateTask={handleUpdateTaskFromModal}
        />
      )}
    </div>
  );
};
