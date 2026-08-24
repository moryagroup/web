import React, { useState, useMemo } from 'react';
import {
  OccasionEvent,
  EventTask,
  TaskStatus,
  Member,
  CurrentUser,
} from '../types';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  CheckCircle2,
  ListChecks,
  Eye,
  EyeOff,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  Clock,
  SlidersHorizontal,
  Lock,
  Layers,
} from 'lucide-react';
import {
  hasAdminPermissions,
  isBadgedMember,
  sortMembersByDesignation,
} from '../utils/rbac';
import { TaskObstacleModal, TaskDrawerTab } from './TaskObstacleModal';

export type OccasionMainTab = 'all_works' | 'manage_occasions';

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
  const isLoggedIn = currentUser.isLoggedIn !== false;
  const isAdmin = isLoggedIn && hasAdminPermissions(currentUser.role);
  const isCommitteeMember =
    isLoggedIn && (hasAdminPermissions(currentUser.role) || isBadgedMember(currentUser.role));

  // Top Tabs State
  const [mainTab, setMainTab] = useState<OccasionMainTab>('all_works');
  const [selectedOccasionFilter, setSelectedOccasionFilter] = useState<string>('all');

  // Occasion Form States
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

  // Active Task Obstacle / Progress Slide-over Drawer State
  const [activeTaskModal, setActiveTaskModal] = useState<{
    task: EventTask;
    occasion: OccasionEvent;
    initialTab?: TaskDrawerTab;
  } | null>(null);

  // Compute all festival tasks across all occasions
  const allFestivalTasks = useMemo(() => {
    const list: { occasion: OccasionEvent; task: EventTask }[] = [];
    (occasions || []).forEach((occ) => {
      (occ.tasks || []).forEach((t) => {
        list.push({ occasion: occ, task: t });
      });
    });
    return list;
  }, [occasions]);

  // Filter tasks based on selected occasion filter
  const filteredTasks = useMemo(() => {
    if (selectedOccasionFilter === 'all') return allFestivalTasks;
    return allFestivalTasks.filter((item) => item.occasion.id === selectedOccasionFilter);
  }, [allFestivalTasks, selectedOccasionFilter]);

  // Status counts
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter((t) => t.task.status === 'पूर्ण').length;
    const inProgress = filteredTasks.filter((t) => t.task.status === 'प्रक्रियेत').length;
    const pending = filteredTasks.filter((t) => !t.task.status || t.task.status === 'प्रलंबित').length;
    const obstacle = filteredTasks.filter((t) => t.task.status === 'अडचण / समस्या').length;
    return { total, completed, inProgress, pending, obstacle };
  }, [filteredTasks]);

  if (!isOpen) return null;

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

  const handleRemoveTaskRow = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
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
    setMainTab('manage_occasions');
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
    setMainTab('manage_occasions');
  };

  const handleUpdateTaskFromModal = (updatedTask: EventTask) => {
    if (!activeTaskModal) return;
    const currentOcc = activeTaskModal.occasion;
    const updatedTasksList = (currentOcc.tasks || []).map((t) =>
      t.id === updatedTask.id ? updatedTask : t
    );
    const updatedOccasion: OccasionEvent = {
      ...currentOcc,
      tasks: updatedTasksList,
    };
    onUpdateOccasion(updatedOccasion);
    setActiveTaskModal({
      task: updatedTask,
      occasion: updatedOccasion,
      initialTab: activeTaskModal.initialTab,
    });
  };

  const handleToggleTaskStatus = (task: EventTask, occasion: OccasionEvent) => {
    const newStatus: TaskStatus = task.status === 'पूर्ण' ? 'प्रलंबित' : 'पूर्ण';
    const updatedTasksList = (occasion.tasks || []).map((t) =>
      t.id === task.id ? { ...t, status: newStatus } : t
    );
    const updatedOccasion: OccasionEvent = {
      ...occasion,
      tasks: updatedTasksList,
    };
    onUpdateOccasion(updatedOccasion);
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
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 max-w-5xl w-full rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-purple-300/80 dark:border-purple-900/60 overflow-hidden flex flex-col max-h-[92vh] text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950 via-[#2A0E00] to-orange-950 text-white flex justify-between items-center shrink-0 border-b border-amber-500/40 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-amber-300">
                  उत्सव व कार्यक्रम व्यवस्थापन
                </h3>
                <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-400/40 text-amber-200 rounded-full text-[10px] font-black">
                  {occasions.length} उत्सव
                </span>
              </div>
              <p className="text-xs text-amber-200/80 font-medium">
                मंडळाचे सर्व उत्सव, नियोजित कामे, जबाबदाऱ्या व सद्यस्थिती प्रगती अहवाल
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-amber-300 hover:text-white rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-amber-500/40 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="बंद करा (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top 2-Option Tab Switcher */}
        <div className="p-3 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            {/* Option 1: All Festival Works */}
            <button
              type="button"
              onClick={() => setMainTab('all_works')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                mainTab === 'all_works'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span>१. उत्सवातील सर्व कामे व सद्यस्थिती</span>
              <span
                className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                  mainTab === 'all_works'
                    ? 'bg-white/20 text-white'
                    : 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-300'
                }`}
              >
                {allFestivalTasks.length}
              </span>
            </button>

            {/* Option 2: Create / Edit Occasions */}
            <button
              type="button"
              onClick={() => {
                if (!isCommitteeMember) {
                  alert('उत्सव तयार किंवा संपादन करण्याचे अधिकार कमिटी सदस्यांना (पदाधिकारी) आहेत.');
                  if (onOpenLogin) onOpenLogin();
                  return;
                }
                setMainTab('manage_occasions');
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                mainTab === 'manage_occasions'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>२. उत्सव तयार / संपादन करा</span>
              {!isCommitteeMember && (
                <span title="फक्त कमिटी सदस्यांसाठी">
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                </span>
              )}
            </button>
          </div>

          {/* Quick Action Button */}
          {mainTab === 'all_works' && isCommitteeMember && (
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ नवीन उत्सव / काम जोडा</span>
            </button>
          )}
        </div>

        {/* Content Body Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs overscroll-contain">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: ALL FESTIVAL WORKS & STATUS (सर्व नियोजित कामे व सद्यस्थिती)       */}
          {/* ========================================================================= */}
          {mainTab === 'all_works' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Filter & Summary Header Bar */}
              <div className="bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-indigo-500/10 dark:from-slate-800 dark:to-slate-800/80 p-4 rounded-2xl border border-purple-200/80 dark:border-purple-800/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Occasion Selector Filter */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      उत्सव निवडा:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedOccasionFilter('all')}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        selectedOccasionFilter === 'all'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      सर्व उत्सव ({allFestivalTasks.length})
                    </button>
                    {occasions.map((occ) => (
                      <button
                        key={occ.id}
                        type="button"
                        onClick={() => setSelectedOccasionFilter(occ.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          selectedOccasionFilter === occ.id
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {occ.name} ({occ.tasks?.length || 0})
                      </button>
                    ))}
                  </div>

                  {/* Status Pills Summary */}
                  <div className="flex items-center gap-2 flex-wrap text-[11px] font-black">
                    <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded-lg border border-blue-300/50">
                      🔄 प्रक्रियेत: {stats.inProgress}
                    </span>
                    <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-lg border border-amber-300/50">
                      ⏳ प्रलंबित: {stats.pending}
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-300/50">
                      ✓ पूर्ण: {stats.completed}
                    </span>
                    {stats.obstacle > 0 && (
                      <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 rounded-lg border border-rose-300/50 animate-pulse">
                        ⚠️ अडचण: {stats.obstacle}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Task Cards Grid */}
              {filteredTasks.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 space-y-3">
                  <Calendar className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
                  <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                    कोणतेही उत्सव काम उपलब्ध नाही.
                  </p>
                  {isCommitteeMember && (
                    <button
                      onClick={handleOpenAdd}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ नवीन उत्सव किंवा काम तयार करा</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTasks.map(({ occasion, task }) => (
                    <div
                      key={task.id}
                      onClick={() =>
                        setActiveTaskModal({ task, occasion, initialTab: 'progress' })
                      }
                      className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border-2 border-purple-200/80 dark:border-purple-900/60 hover:border-amber-400 dark:hover:border-amber-500/60 shadow-md hover:shadow-xl transition-all space-y-3 flex flex-col justify-between cursor-pointer group"
                      title="कामाचे संपूर्ण तपशील, प्रगती व सूचना पाहण्यासाठी क्लिक करा"
                    >
                      <div className="space-y-2">
                        {/* Top row: Occasion Badge + Status Pill */}
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1">
                            🎉 {occasion.name} ({occasion.year})
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black border shadow-2xs flex items-center gap-1 ${
                              task.status === 'पूर्ण'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                : task.status === 'प्रक्रियेत'
                                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                : task.status === 'अडचण / समस्या'
                                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700 animate-pulse'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                            }`}
                          >
                            {task.status === 'पूर्ण' && '✓ '}
                            {task.status === 'अडचण / समस्या' && '⚠️ '}
                            {task.status}
                          </span>
                        </div>

                        {/* Task Title */}
                        <div>
                          <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-amber-300 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {task.taskTitle}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              👤 प्रमुख व्यवस्थापक:
                            </span>
                            <span className="font-extrabold text-indigo-700 dark:text-amber-200">
                              {task.assignedMemberName}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              ({task.assignedMemberRole || 'सभासद'})
                            </span>
                          </p>
                        </div>

                        {/* Latest Progress Update Box */}
                        {task.progressUpdates && task.progressUpdates.length > 0 && (
                          <div className="p-2.5 bg-blue-50/80 dark:bg-slate-900/80 border border-blue-200 dark:border-slate-700 rounded-xl text-xs space-y-0.5">
                            <div className="flex items-center justify-between text-[10px] text-blue-900 dark:text-blue-300 font-bold">
                              <span className="flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 text-blue-600" />
                                सद्यस्थिती / प्रगती (नवीनतम):
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {task.progressUpdates[0].createdAt}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 italic">
                              "{task.progressUpdates[0].progressNote}"
                              <span className="text-[10px] font-normal text-slate-500 not-italic block mt-0.5">
                                — {task.progressUpdates[0].memberName} (
                                {task.progressUpdates[0].memberRole || 'सभासद'})
                              </span>
                            </p>
                          </div>
                        )}

                        {/* Obstacle Detail Box */}
                        {task.status === 'अडचण / समस्या' && (
                          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700/60 rounded-xl space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-bold">
                              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 animate-bounce" />
                              <span>कामात अडचण आल्याने थांबले आहे</span>
                            </div>
                            {task.obstacleDetails && (
                              <p className="text-xs text-rose-700 dark:text-rose-200 italic font-medium">
                                "{task.obstacleDetails}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons Row */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTaskModal({ task, occasion, initialTab: 'progress' });
                          }}
                          className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>
                            + प्रगती नोंदवा
                            {(task.progressUpdates?.length || 0) > 0
                              ? ` (${task.progressUpdates?.length})`
                              : ''}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTaskModal({
                              task,
                              occasion,
                              initialTab:
                                task.status === 'अडचण / समस्या' ? 'details' : 'suggestions',
                            });
                          }}
                          className="flex-1 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>
                            {task.status === 'अडचण / समस्या'
                              ? '⚠️ अडचण / स्वरूप'
                              : '💬 तपशील / सूचना'}
                            {(task.suggestions?.length || 0) > 0
                              ? ` (${task.suggestions?.length})`
                              : ''}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTaskStatus(task, occasion);
                          }}
                          className={`px-3.5 py-2 font-black text-xs rounded-xl border shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                            task.status === 'पूर्ण'
                              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-md'
                          }`}
                        >
                          {task.status === 'पूर्ण' ? 'पुन्हा उघडा' : '✓ पूर्ण चिन्हांकित करा'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: MANAGE OCCASIONS & CREATE/EDIT (उत्सव तयार / संपादन करा)            */}
          {/* ========================================================================= */}
          {mainTab === 'manage_occasions' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Form Section (Add / Edit) */}
              {isFormOpen ? (
                <form
                  onSubmit={handleSubmit}
                  className="bg-slate-50 dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm"
                >
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-800 dark:text-amber-300 text-sm">
                        {editingId ? 'उत्सव/कार्यक्रम अद्ययावत करा' : '+ नवीन उत्सव/कार्यक्रम जोडा'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsFormCollapsed((prev) => !prev)}
                        className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg font-black text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="उत्सव माहिती फॉर्म लपवा / दाखवा"
                      >
                        {isFormCollapsed ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-amber-800" />
                            <span>👁️ माहिती दाखवा</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-amber-800" />
                            <span>👁️ माहिती लपवा</span>
                          </>
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-slate-500 hover:text-slate-700 dark:text-slate-400 font-bold"
                    >
                      रद्द करा
                    </button>
                  </div>

                  {isFormCollapsed ? (
                    <div className="p-3 bg-amber-50/90 dark:bg-slate-900 border border-amber-200 dark:border-amber-700 rounded-xl flex items-center justify-between text-xs font-bold text-amber-950 dark:text-amber-300 shadow-xs">
                      <span>📌 {name || 'नवीन उत्सव'} ({year})</span>
                      <span className="text-[11px] text-amber-800 dark:text-amber-400 font-medium">
                        माहिती फॉर्म लपवला आहे
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                            उत्सवाचे / कार्यक्रमाचे नाव <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="उदा. गणेशोत्सव २०२६ / शिवजयंती उत्सव"
                            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                            आर्थिक वर्ष (Financial Year)
                          </label>
                          <input
                            type="text"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            placeholder="उदा. २०२६-२७"
                            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                            सुरुवात तारीख (Start Date)
                          </label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                            समाप्ती तारीख (End Date)
                          </label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                          वर्णन / तपशील (Description)
                        </label>
                        <textarea
                          rows={2}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="उदा. १० दिवस गणेशोत्सव भव्य महाप्रसाद व सांस्कृतिक कार्यक्रम"
                          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                            कामाचे स्वरूप / जबाबदारी (Work Details)
                          </label>
                          <input
                            type="text"
                            value={workDetails}
                            onChange={(e) => setWorkDetails(e.target.value)}
                            placeholder="उदा. मंडप सजावट, ध्वनी व प्रकाश, भोजन नियोजन"
                            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                            प्रमुख / जबाबदार व्यक्ती (Responsible Manager)
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <select
                              onChange={(e) => {
                                if (e.target.value) setResponsiblePerson(e.target.value);
                              }}
                              className="p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 cursor-pointer"
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
                              className="flex-1 p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Multiple Event Tasks & Manager Assignment */}
                  <div className="bg-amber-50/90 dark:bg-slate-900 p-4 rounded-2xl border border-amber-300 dark:border-slate-700 space-y-3">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <label className="font-black text-amber-950 dark:text-amber-300 flex items-center gap-1.5 text-xs sm:text-sm">
                        <ListChecks className="w-4 h-4 text-amber-600" />
                        <span>उत्सवातील विविध कामे व जबाबदार सभासद ({tasks.length} कामे)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleOpenAddTaskModal}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ काम/जबाबदारी जोडा</span>
                      </button>
                    </div>

                    {tasks.length === 0 ? (
                      <p className="text-xs text-amber-800 dark:text-amber-400 italic text-center py-4 bg-white/70 dark:bg-slate-800/80 rounded-xl border border-dashed border-amber-200 dark:border-slate-700">
                        या उत्सवासाठी अद्याप कोणतीही कामे जोडलेली नाहीत. वर '+ काम/जबाबदारी जोडा' बटणावर क्लिक करून नवीन काम जोडा.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {tasks.map((task, idx) => (
                          <div
                            key={task.id}
                            className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-amber-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs shadow-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-slate-900 dark:text-white">
                                  #{idx + 1} {task.taskTitle}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black ${
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
                              <div className="text-[11px] text-amber-900 dark:text-amber-300 font-bold flex flex-wrap items-center gap-2">
                                <span>
                                  👑 प्रमुख: {task.assignedMemberName} ({task.assignedMemberRole || 'सभासद'})
                                </span>
                                {task.teamMembers && task.teamMembers.length > 0 && (
                                  <div className="flex flex-wrap gap-1 items-center">
                                    <span className="text-slate-500 font-normal">| 👥 टीम:</span>
                                    {task.teamMembers.map((tm) => (
                                      <span
                                        key={tm.id}
                                        className="px-1.5 py-0.2 bg-amber-100 dark:bg-slate-700 text-amber-950 dark:text-white rounded text-[10px]"
                                      >
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
                                className="p-2 text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-all"
                                title="काम संपादित करा (Edit Task)"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveTaskRow(task.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-all"
                                title="काम काढून टाका"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-300 cursor-pointer"
                    >
                      रद्द करा
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingId ? 'साठवा (Save)' : 'जोडा (Add)'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400 font-black text-xs sm:text-sm">
                    सर्व नोंदणीकृत उत्सव ({occasions.length}):
                  </span>
                  <button
                    onClick={handleOpenAdd}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ नवीन उत्सव जोडा</span>
                  </button>
                </div>
              )}

              {/* Registered Occasions List */}
              <div className="space-y-3">
                {occasions.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold text-slate-500">कोणतेही उत्सव नोंदणीकृत नाहीत.</p>
                  </div>
                ) : (
                  occasions.map((occ) => (
                    <div
                      key={occ.id}
                      className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 transition-all flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                            {occ.name}
                          </h4>
                          <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black rounded-md text-[11px]">
                            वर्ष: {occ.year}
                          </span>
                          {occ.tasks && occ.tasks.length > 0 && (
                            <span className="px-2.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-700 font-black rounded-md text-[11px]">
                              {occ.tasks.length} नियोजित कामे
                            </span>
                          )}
                        </div>

                        {occ.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {occ.description}
                          </p>
                        )}

                        {(occ.workDetails || occ.responsiblePerson) && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            {occ.workDetails && (
                              <span className="px-2.5 py-1 bg-amber-50 dark:bg-slate-900 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-slate-700 rounded-lg font-bold">
                                काम/स्वरूप: {occ.workDetails}
                              </span>
                            )}
                            {occ.responsiblePerson && (
                              <span className="px-2.5 py-1 bg-purple-50 dark:bg-slate-900 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-slate-700 rounded-lg font-bold">
                                प्रमुख: {occ.responsiblePerson}
                              </span>
                            )}
                          </div>
                        )}

                        {(occ.startDate || occ.endDate) && (
                          <p className="text-[11px] text-slate-400">
                            कालावधी: {occ.startDate || '—'} ते {occ.endDate || '—'}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(occ)}
                          className="p-2 text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                          title="उत्सव व कामे संपादित करा"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(occ.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                            title="हटवा"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            💡 टिप: कोणत्याही कामावर क्लिक केल्यास उजव्या बाजूने सविस्तर ड्रॉवर उघडेल.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            बंद करा (Close)
          </button>
        </div>
      </div>

      {/* Task Creation / Editing Pop-up Sub-Modal Window */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
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
                <div className="p-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-lg text-[11px] font-bold">
                  {taskModalError}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
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
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  प्रमुख व्यवस्थापक (Lead Manager)
                </label>
                <select
                  value={modalAssignedMemberId}
                  onChange={(e) => setModalAssignedMemberId(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer"
                >
                  {sortMembersByDesignation(members).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.memberCode} - {m.fullName} ({m.designation || 'सभासद'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  स्थिती (Status)
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as TaskStatus)}
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer"
                >
                  <option value="प्रलंबित">⏳ प्रलंबित</option>
                  <option value="प्रक्रियेत">🔄 प्रक्रियेत</option>
                  <option value="पूर्ण">✓ पूर्ण</option>
                  <option value="अडचण / समस्या">⚠️ अडचण / समस्या</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  सहकार्यकारी सभासद / टीम सदस्य (Team Members)
                </label>
                <div className="flex gap-2">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddTeamMemberToModal(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer"
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

                <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  {modalTeamMembers.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic">
                      कोणतेही अतिरिक्त टीम सदस्य जोडलेले नाहीत.
                    </span>
                  ) : (
                    modalTeamMembers.map((tm) => (
                      <span
                        key={tm.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-slate-700 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-slate-600 rounded-md text-[10px] font-bold"
                      >
                        <span>👤 {tm.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamMemberFromModal(tm.id)}
                          className="text-amber-800 dark:text-amber-300 hover:text-rose-700 font-bold ml-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-300 cursor-pointer"
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

      {/* Active Task Progress & Details Drawer Overlay */}
      {activeTaskModal && (
        <TaskObstacleModal
          isOpen={true}
          onClose={() => setActiveTaskModal(null)}
          task={activeTaskModal.task}
          occasion={activeTaskModal.occasion}
          currentUser={currentUser}
          initialTab={activeTaskModal.initialTab || 'progress'}
          onUpdateTask={handleUpdateTaskFromModal}
        />
      )}
    </div>
  );
};

