import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  RefreshCw,
  UserCheck,
  FileText,
} from 'lucide-react';
import {
  EventTask,
  TaskStatus,
  TaskSuggestion,
  TaskProgressUpdate,
  CurrentUser,
  OccasionEvent,
} from '../types';
import { notificationService } from '../services/notificationService';
import { WhatsAppNotifier } from '../utils/whatsAppNotifier';

export type TaskDrawerTab = 'progress' | 'suggestions' | 'details';

export interface TaskObstacleModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: EventTask;
  occasion: OccasionEvent;
  currentUser: CurrentUser;
  onUpdateTask: (updatedTask: EventTask) => void;
  initialTab?: TaskDrawerTab;
}

export const TaskObstacleModal: React.FC<TaskObstacleModalProps> = ({
  isOpen,
  onClose,
  task,
  occasion,
  currentUser,
  onUpdateTask,
  initialTab = 'progress',
}) => {
  const [activeTab, setActiveTab] = useState<TaskDrawerTab>(initialTab);
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>(task.status || 'प्रलंबित');
  const [obstacleInput, setObstacleInput] = useState<string>(task.obstacleDetails || '');

  // Progress Update Form State
  const [progressText, setProgressText] = useState<string>('');

  // Suggestions Form State
  const [suggestionText, setSuggestionText] = useState<string>('');

  // Sync state when task changes or drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setCurrentStatus(task.status || 'प्रलंबित');
      setObstacleInput(task.obstacleDetails || '');
      setProgressText('');
      setSuggestionText('');
    }
  }, [isOpen, initialTab, task]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Add Progress Update
  const handleAddProgressUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressText.trim()) return;

    const newProgress: TaskProgressUpdate = {
      id: `prog-${Date.now()}`,
      memberName: currentUser.name || 'सभासद',
      memberRole: currentUser.role || 'सभासद',
      progressNote: progressText.trim(),
      createdAt: new Date().toLocaleDateString('mr-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const updatedProgressList = [newProgress, ...(task.progressUpdates || [])];
    const updated: EventTask = {
      ...task,
      status: currentStatus,
      obstacleDetails: obstacleInput.trim() || task.obstacleDetails,
      progressUpdates: updatedProgressList,
    };

    onUpdateTask(updated);

    notificationService.notify({
      type: 'task_status',
      title: `कामाची प्रगती नोंदवली: ${task.taskTitle}`,
      message: `${currentUser.name} (${currentUser.role || 'सभासद'}): "${progressText.trim()}"`,
      occasionId: occasion.id,
      occasionName: occasion.name,
      taskId: task.id,
      taskTitle: task.taskTitle,
      memberName: currentUser.name,
      targetTab: 'dashboard',
    });

    setProgressText('');
  };

  // Status Change Handler
  const handleStatusChange = (newStatus: TaskStatus) => {
    setCurrentStatus(newStatus);
    const updated: EventTask = {
      ...task,
      status: newStatus,
      obstacleDetails: newStatus === 'अडचण / समस्या' ? obstacleInput : task.obstacleDetails,
    };
    onUpdateTask(updated);

    if (newStatus === 'अडचण / समस्या') {
      notificationService.notify({
        type: 'task_obstacle',
        title: `कामात अडचण: ${task.taskTitle}`,
        message: `${task.assignedMemberName} यांनी '${occasion.name}' मधील कामात अडचण नोंदवली.`,
        occasionId: occasion.id,
        occasionName: occasion.name,
        taskId: task.id,
        taskTitle: task.taskTitle,
        memberName: task.assignedMemberName,
        targetTab: 'dashboard',
        priority: 'high',
        whatsAppMessage: WhatsAppNotifier.formatTaskObstacleMessage({
          occasionName: occasion.name,
          taskTitle: task.taskTitle,
          assignedMemberName: task.assignedMemberName,
          obstacleDetails: obstacleInput || task.obstacleDetails || 'कामात अडचण निर्माण झाली आहे.',
        }),
      });
    } else {
      notificationService.notify({
        type: 'task_status',
        title: `कामाचा दर्जा बदलला: ${task.taskTitle}`,
        message: `सध्याचा दर्जा: ${newStatus} (${task.assignedMemberName})`,
        occasionId: occasion.id,
        occasionName: occasion.name,
        taskId: task.id,
        taskTitle: task.taskTitle,
        targetTab: 'dashboard',
      });
    }
  };

  // Save Obstacle Details
  const handleSaveObstacleDetails = () => {
    const details = obstacleInput.trim() || undefined;
    const updated: EventTask = {
      ...task,
      status: currentStatus,
      obstacleDetails: details,
    };
    onUpdateTask(updated);

    if (details) {
      notificationService.notify({
        type: 'task_obstacle',
        title: `कामात अडचण: ${task.taskTitle}`,
        message: `${task.assignedMemberName}: ${details}`,
        occasionId: occasion.id,
        occasionName: occasion.name,
        taskId: task.id,
        taskTitle: task.taskTitle,
        memberName: task.assignedMemberName,
        targetTab: 'dashboard',
        priority: 'high',
        whatsAppMessage: WhatsAppNotifier.formatTaskObstacleMessage({
          occasionName: occasion.name,
          taskTitle: task.taskTitle,
          assignedMemberName: task.assignedMemberName,
          obstacleDetails: details,
        }),
      });
    }
  };

  // Add Suggestion Handler
  const handleAddSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionText.trim()) return;

    const newSuggestion: TaskSuggestion = {
      id: `sug-${Date.now()}`,
      memberName: currentUser.name || 'सभासद',
      memberRole: currentUser.role || 'सभासद',
      suggestionText: suggestionText.trim(),
      createdAt: new Date().toLocaleDateString('mr-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const updatedSuggestions = [...(task.suggestions || []), newSuggestion];
    const updated: EventTask = {
      ...task,
      status: currentStatus,
      obstacleDetails: obstacleInput.trim() || task.obstacleDetails,
      suggestions: updatedSuggestions,
    };

    onUpdateTask(updated);

    notificationService.notify({
      type: 'suggestion',
      title: `कामावर नवीन सूचना: ${task.taskTitle}`,
      message: `${currentUser.name} (${currentUser.role || 'सभासद'}) यांनी उपाय/सूचना नोंदवली: "${suggestionText.trim()}"`,
      occasionId: occasion.id,
      occasionName: occasion.name,
      taskId: task.id,
      taskTitle: task.taskTitle,
      targetTab: 'dashboard',
    });

    setSuggestionText('');
  };

  const progressList = task.progressUpdates || [];
  const suggestionsList = task.suggestions || [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <aside
        className="fixed inset-y-0 right-0 z-[101] w-full sm:max-w-xl md:max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-l-2 border-amber-500/40 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300 text-slate-900 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-amber-950 via-[#2A0E00] to-orange-950 text-white p-4 sm:p-5 border-b border-amber-500/40 shrink-0 shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 bg-purple-600/90 text-white font-black text-[11px] rounded-lg shadow-xs flex items-center gap-1">
                  🎉 {occasion.name} ({occasion.year})
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border shadow-2xs flex items-center gap-1 ${
                    currentStatus === 'पूर्ण'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                      : currentStatus === 'प्रक्रियेत'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-400/50'
                      : currentStatus === 'अडचण / समस्या'
                      ? 'bg-rose-500/30 text-rose-300 border-rose-500/60 animate-pulse'
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                  }`}
                >
                  {currentStatus === 'पूर्ण' && '✓ '}
                  {currentStatus === 'अडचण / समस्या' && '⚠️ '}
                  {currentStatus}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-amber-300 truncate">
                {task.taskTitle}
              </h2>

              <p className="text-xs text-amber-200/90 font-medium flex items-center gap-1.5 flex-wrap">
                <span>👤 प्रमुख व्यवस्थापक:</span>
                <span className="font-extrabold text-white">{task.assignedMemberName}</span>
                <span className="text-[11px] text-amber-300/80">({task.assignedMemberRole || 'सभासद'})</span>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-amber-300 hover:text-white border border-amber-500/40 transition-all cursor-pointer shrink-0 active:scale-95 shadow-sm"
              title="ड्रॉवर बंद करा (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Tab Switcher Navigation */}
          <div className="mt-4 pt-3 border-t border-amber-900/60 grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('progress')}
              className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'progress'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">१. प्रगती</span>
              {progressList.length > 0 && (
                <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px]">
                  {progressList.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('suggestions')}
              className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'suggestions'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">२. सूचना</span>
              {suggestionsList.length > 0 && (
                <span className="px-1.5 py-0.2 bg-slate-950/40 text-slate-900 dark:text-white rounded-full text-[10px] font-black">
                  {suggestionsList.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'details'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">३. स्वरूप</span>
              {task.status === 'अडचण / समस्या' && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 overscroll-contain">
          {/* TAB 1: PROGRESS UPDATES */}
          {activeTab === 'progress' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Add Progress Update Form */}
              <div className="p-4 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl border-2 border-blue-300/60 dark:border-blue-700/50 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-950 dark:text-blue-300 font-black text-sm">
                    <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>+ नवीन कामाची प्रगती नोंदवा</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>{currentUser.name}</span>
                  </div>
                </div>

                <form onSubmit={handleAddProgressUpdate} className="space-y-3">
                  <textarea
                    rows={3}
                    required
                    value={progressText}
                    onChange={(e) => setProgressText(e.target.value)}
                    placeholder="उदा. मंडपाचे काम ८०% पूर्ण झाले आहे / ध्वनी क्षेपक व लाईटची सर्व तयारी झाली..."
                    className="w-full p-3 bg-white dark:bg-slate-900 border border-blue-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium shadow-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>प्रगती नोंदवा (Post Progress)</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Progress Timeline Feed */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>कामाचा प्रगती अहवाल व सद्यस्थिती</span>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded-full text-[11px]">
                      {progressList.length} नोंदी
                    </span>
                  </h3>
                </div>

                {progressList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                    <RefreshCw className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      या कामाची अद्याप कोणतीही प्रगती नोंदवलेली नाही.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      वर दिलेल्या बॉक्समध्ये आजची कामाची प्रगती लिहून नोंदवा.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {progressList.map((prog, idx) => (
                      <div
                        key={prog.id || idx}
                        className="p-3.5 bg-white dark:bg-slate-800/90 rounded-2xl border border-blue-200/80 dark:border-slate-700 shadow-sm space-y-2 hover:border-blue-400 transition-all"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-black text-slate-900 dark:text-white flex items-center gap-1">
                            👤 {prog.memberName}
                            <span className="text-[10px] text-blue-700 dark:text-blue-400 font-bold">
                              ({prog.memberRole || 'सभासद'})
                            </span>
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">{prog.createdAt}</span>
                        </div>

                        <div className="p-3 bg-blue-50/70 dark:bg-slate-900/80 rounded-xl border border-blue-100 dark:border-slate-700">
                          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                            "{prog.progressNote}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SUGGESTIONS & FEEDBACK */}
          {activeTab === 'suggestions' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Add Suggestion Form */}
              <div className="p-4 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl border-2 border-amber-300/60 dark:border-amber-700/50 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-950 dark:text-amber-300 font-black text-sm">
                    <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>+ कामासाठी सूचना / उपाय नोंदवा</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>{currentUser.name}</span>
                  </div>
                </div>

                <form onSubmit={handleAddSuggestion} className="space-y-3">
                  <textarea
                    rows={3}
                    required
                    value={suggestionText}
                    onChange={(e) => setSuggestionText(e.target.value)}
                    placeholder="कामातील अडचण सोडवण्यासाठी किंवा कामाच्या नियोजनासाठी तुमची सूचना / उपाय इथे लिहा..."
                    className="w-full p-3 bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium shadow-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>सूचना नोंदवा (Post Suggestion)</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Suggestions Feed */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>कमिटी सदस्यांनी दिलेल्या सूचना / उपाय</span>
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-full text-[11px]">
                      {suggestionsList.length} सूचना
                    </span>
                  </h3>
                </div>

                {suggestionsList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      या कामावर अद्याप कोणतीही सूचना प्राप्त झालेली नाही.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      कामाबाबत उपयुक्त सूचना किंवा उपाय वर दिलेल्या बॉक्समध्ये लिहा.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestionsList.map((sug, idx) => (
                      <div
                        key={sug.id || idx}
                        className="p-3.5 bg-white dark:bg-slate-800/90 rounded-2xl border border-amber-200/80 dark:border-slate-700 shadow-sm space-y-2 hover:border-amber-400 transition-all"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-black text-slate-900 dark:text-white flex items-center gap-1">
                            💬 {sug.memberName}
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                              ({sug.memberRole || 'सभासद'})
                            </span>
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">{sug.createdAt}</span>
                        </div>

                        <div className="p-3 bg-amber-50/60 dark:bg-slate-900/80 rounded-xl border border-amber-100 dark:border-slate-700">
                          <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                            "{sug.suggestionText}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: WORK DETAILS, STATUS & OBSTACLES */}
          {activeTab === 'details' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Status Switcher Box */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  कामाचा सध्याचा दर्जा (Current Task Status)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusChange('प्रलंबित')}
                    className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      currentStatus === 'प्रलंबित'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>⏳ प्रलंबित</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange('प्रक्रियेत')}
                    className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      currentStatus === 'प्रक्रियेत'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-400'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>🔄 प्रक्रियेत</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange('पूर्ण')}
                    className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      currentStatus === 'पूर्ण'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✓ पूर्ण</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange('अडचण / समस्या')}
                    className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      currentStatus === 'अडचण / समस्या'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md ring-2 ring-rose-400'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>⚠️ अडचण</span>
                  </button>
                </div>
              </div>

              {/* Work Details Summary Card */}
              <div className="p-4 bg-purple-50/60 dark:bg-slate-800/80 rounded-2xl border border-purple-200/80 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2 text-purple-950 dark:text-purple-300 font-black text-sm">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>कामाचे स्वरूप व माहिती</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">
                      काम / उपक्रमाचे नाव:
                    </span>
                    <span className="font-black text-slate-900 dark:text-amber-300 text-sm">
                      {task.taskTitle}
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">
                      प्रमुख व्यवस्थापक:
                    </span>
                    <span className="font-extrabold text-indigo-700 dark:text-amber-200 text-sm">
                      {task.assignedMemberName}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      ({task.assignedMemberRole || 'सभासद'})
                    </span>
                  </div>

                  {occasion.workDetails && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-700 sm:col-span-2">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">
                        उत्सवाचे एकूण स्वरूप व नियोजन:
                      </span>
                      <p className="font-medium text-slate-800 dark:text-slate-200 mt-1">
                        {occasion.workDetails}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Obstacle Description Section */}
              <div className="p-4 bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-rose-500/15 dark:from-rose-950/40 dark:to-slate-800 rounded-2xl border-2 border-rose-300/80 dark:border-rose-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-950 dark:text-rose-300 font-black text-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-bounce" />
                    <span>कामातील अडचण / समस्येचे स्वरूप (Obstacle Details)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveObstacleDetails}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-lg shadow-xs cursor-pointer transition-all active:scale-95"
                  >
                    जतन करा
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={obstacleInput}
                  onChange={(e) => setObstacleInput(e.target.value)}
                  placeholder="उदा. मंडप डेकोरेटरकडे कापड कमी पडले आहे / वीज जोडणी परवाना मिळण्यास उशीर होत आहे..."
                  className="w-full p-3 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-rose-500 focus:outline-none font-medium shadow-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Drawer Bottom Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              सध्याचा दर्जा:
            </span>
            <span className="text-xs font-black text-slate-900 dark:text-white">
              {currentStatus}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextStatus = currentStatus === 'पूर्ण' ? 'प्रलंबित' : 'पूर्ण';
                handleStatusChange(nextStatus);
              }}
              className={`px-3.5 py-2 font-black text-xs rounded-xl border shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                currentStatus === 'पूर्ण'
                  ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-md'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{currentStatus === 'पूर्ण' ? 'पुन्हा उघडा (Reopen)' : '✓ पूर्ण चिन्हांकित करा'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all active:scale-95"
            >
              बंद करा
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export const TaskDetailsDrawer = TaskObstacleModal;

