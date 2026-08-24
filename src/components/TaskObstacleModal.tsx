import React, { useState } from 'react';
import { X, AlertTriangle, MessageSquare, Send, CheckCircle2, Clock, RefreshCw, UserCheck } from 'lucide-react';
import { EventTask, TaskStatus, TaskSuggestion, CurrentUser, OccasionEvent } from '../types';

import { notificationService } from '../services/notificationService';
import { WhatsAppNotifier } from '../utils/whatsAppNotifier';

interface TaskObstacleModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: EventTask;
  occasion: OccasionEvent;
  currentUser: CurrentUser;
  onUpdateTask: (updatedTask: EventTask) => void;
}

export const TaskObstacleModal: React.FC<TaskObstacleModalProps> = ({
  isOpen,
  onClose,
  task,
  occasion,
  currentUser,
  onUpdateTask,
}) => {
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>(task.status || 'अडचण / समस्या');
  const [obstacleInput, setObstacleInput] = useState<string>(task.obstacleDetails || '');
  const [suggestionText, setSuggestionText] = useState<string>('');
  const [isAddingSuggestion, setIsAddingSuggestion] = useState<boolean>(false);

  if (!isOpen) return null;

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
    setIsAddingSuggestion(false);
  };

  const suggestionsList = task.suggestions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl my-6 overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-amber-200 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{task.taskTitle}</h2>
              <p className="text-xs text-amber-100">
                उत्सव: <span className="font-semibold text-white">{occasion.name}</span> | प्रमुख: {task.assignedMemberName} ({task.assignedMemberRole || 'सभासद'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Quick Switch Bar */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-2">
              कामाची सद्यस्थिती (Sub-Task Status)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('प्रलंबित')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  currentStatus === 'प्रलंबित'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm ring-2 ring-amber-400'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>⏳ प्रलंबित</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('प्रक्रियेत')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  currentStatus === 'प्रक्रियेत'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm ring-2 ring-blue-400'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>🔄 प्रक्रियेत</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('पूर्ण')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  currentStatus === 'पूर्ण'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm ring-2 ring-emerald-400'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>✓ पूर्ण</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('अडचण / समस्या')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  currentStatus === 'अडचण / समस्या'
                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm ring-2 ring-rose-400'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>⚠️ अडचण</span>
              </button>
            </div>
          </div>

          {/* Obstacle Description Section */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>कामातील अडचण / समस्येचे स्वरूप (Obstacle Details)</span>
              </div>
              <button
                type="button"
                onClick={handleSaveObstacleDetails}
                className="text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
              >
                जतन करा
              </button>
            </div>
            <textarea
              rows={3}
              value={obstacleInput}
              onChange={(e) => setObstacleInput(e.target.value)}
              placeholder="उदा. मंडप डेकोरेटरकडे कापड कमी पडले आहे / वीज जोडणी परवाना मिळण्यास उशीर होत आहे..."
              className="w-full p-3 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Committee Member Suggestions List Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>कमिटी सदस्यांनी दिलेल्या सूचना / उपाय ({suggestionsList.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingSuggestion(!isAddingSuggestion)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer"
              >
                + सूचना द्या
              </button>
            </div>

            {/* Input suggestion form */}
            {isAddingSuggestion && (
              <form onSubmit={handleAddSuggestion} className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-bold">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>तुमचे नाव: {currentUser.name} ({currentUser.role || 'सभासद'})</span>
                </div>
                <textarea
                  rows={2}
                  required
                  value={suggestionText}
                  onChange={(e) => setSuggestionText(e.target.value)}
                  placeholder="कामातील अडचण सोडवण्यासाठी तुमची सूचना किंवा पर्याय इथे लिहा..."
                  className="w-full p-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingSuggestion(false)}
                    className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-md cursor-pointer"
                  >
                    रद्द करा
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>सूचना नोंदवा</span>
                  </button>
                </div>
              </form>
            )}

            {/* Render suggestion comments list */}
            {suggestionsList.length === 0 ? (
              <div className="p-6 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs italic">
                या अडचणीवर अद्याप कोणतीही सूचना प्राप्त झालेली नाही. वर '+ सूचना द्या' बटणावर क्लिक करून तुमची सूचना नोंदवा.
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {suggestionsList.map((sug) => (
                  <div
                    key={sug.id}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {sug.memberName} <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">({sug.memberRole})</span>
                      </span>
                      <span className="text-[10px]">{sug.createdAt}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed bg-emerald-50/50 dark:bg-slate-900/60 p-2 rounded-lg border border-emerald-100/60 dark:border-slate-700">
                      "{sug.suggestionText}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
          >
            बंद करा (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
