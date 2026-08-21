import React, { useState } from 'react';
import { CheckCircle2, Download, Share2, PlusCircle, ListFilter, X, ShieldCheck, Clock, FileText, Check } from 'lucide-react';
import { IncomeTransaction, ExpenseTransaction } from '../types';
import { downloadReceiptImage } from '../services/transactionDispatchService';
import { formatMarathiDate, toMarathiDigits } from '../utils/receiptCanvasGenerator';

interface TransactionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'INCOME' | 'EXPENSE';
  transaction: IncomeTransaction | ExpenseTransaction | null;
  groupLogo?: string;
  onAddNew?: () => void;
  onViewHistory?: () => void;
}

export const TransactionSuccessModal: React.FC<TransactionSuccessModalProps> = ({
  isOpen,
  onClose,
  type,
  transaction,
  groupLogo,
  onAddNew,
  onViewHistory,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen || !transaction) return null;

  const isIncome = type === 'INCOME';
  const inc = isIncome ? (transaction as IncomeTransaction) : null;
  const exp = !isIncome ? (transaction as ExpenseTransaction) : null;

  const isApproved = transaction.approvalStatus === 'मंजूर';
  const personName = isIncome ? inc?.depositorName : exp?.recipientName;
  const categoryName = isIncome ? inc?.incomeType : exp?.expenseCategory;
  const dateStr = isIncome ? inc?.transactionDate : exp?.expenseDate;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadReceiptImage(transaction, type, groupLogo);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Receipt download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsAppShare = () => {
    const rawReceiptNo = inc?.receiptNumber ? `#${inc.receiptNumber}` : transaction.transactionNo;
    const typeTitle = isIncome ? 'जमा पावती' : 'खर्च व्हाऊचर';
    
    let text = `🚩 *मोरया ग्रुप मित्र मंडळ (ट्रस्ट)* 🚩\n`;
    text += `*अधिकृत ${typeTitle}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔹 *व्यवहार क्र.:* ${transaction.transactionNo || 'N/A'}\n`;
    if (inc?.receiptNumber) {
      text += `🔹 *पावती क्र.:* ${inc.receiptNumber}\n`;
    }
    text += `🔹 *${isIncome ? 'जमादार' : 'प्राप्तकर्ता'}:* ${personName || 'देणगीदार'}\n`;
    text += `🔹 *रक्कम:* ₹${transaction.amount.toLocaleString('en-IN')}/- (${toMarathiDigits(transaction.amount.toLocaleString('en-IN'))} रुपये)\n`;
    text += `🔹 *प्रकार:* ${categoryName || 'वर्गणी'}\n`;
    text += `🔹 *दिनांक:* ${formatMarathiDate(dateStr)}\n`;
    text += `🔹 *भरणा पद्धत:* ${transaction.paymentMethod || 'रोख'}\n`;
    if (transaction.paymentReference) {
      text += `🔹 *संदर्भ / UTR:* ${transaction.paymentReference}\n`;
    }
    if (isIncome && inc?.cashReceiverName && inc.paymentMethod === 'रोख') {
      text += `🔹 *रोख स्वीकारणारे:* ${inc.cashReceiverName}\n`;
    }
    text += `🔹 *स्थिती:* ${isApproved ? '✅ मंजूर (Approved)' : '⏳ प्रलंबित (Pending Approval)'}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_मोरया ग्रुप मित्र मंडळ, हडपसर गोंधळनगर, पुणे._\n`;
    text += `_गणपती बाप्पा मोरया, मंगलमूर्ती मोरया!_ 🌺`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden transform transition-all my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Background Banner */}
        <div className={`p-6 text-center text-white relative ${isIncome ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-rose-600 to-amber-700'}`}>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Success Checkmark with Animation Glow */}
          <div className="mx-auto w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner ring-4 ring-white/30">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {isIncome ? 'जमा नोंद यशस्वी!' : 'खर्च नोंद यशस्वी!'}
          </h2>
          <p className="text-xs sm:text-sm text-white/90 mt-1 font-medium">
            {isApproved
              ? 'व्यवहार मंजूर झाला असून खात्यात नोंदवला गेला आहे.'
              : 'व्यवहार नोंदवला असून खजिनदार / ॲडमिन मंजुरीसाठी प्रलंबित आहे.'}
          </p>
        </div>

        {/* Transaction Summary Card */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            {/* Transaction No & Status Badge */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">व्यवहार क्रमांक:</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                  {transaction.transactionNo}
                </span>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isApproved 
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60' 
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/60'
              }`}>
                {isApproved ? <ShieldCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {isApproved ? 'मंजूर' : 'प्रलंबित'}
              </span>
            </div>

            {/* Amount Big Display */}
            <div className="text-center py-2 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">एकूण रक्कम</span>
              <div className={`text-2xl sm:text-3xl font-black ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                ₹{transaction.amount.toLocaleString('en-IN')}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1.5">
                  ({toMarathiDigits(transaction.amount.toLocaleString('en-IN'))} रु.)
                </span>
              </div>
            </div>

            {/* Key Value Details Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-white dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">
                  {isIncome ? 'जमादार' : 'प्राप्तकर्ता'}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                  {personName || 'देणगीदार'}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">
                  {isIncome ? 'वर्गणी / देणगी प्रकार' : 'खर्च प्रकार'}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                  {categoryName || 'इतर'}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">दिनांक</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                  {formatMarathiDate(dateStr)}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">भरणा पद्धत</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                  {transaction.paymentMethod === 'रोख' ? '💵 रोख (Cash)' : '🌐 ऑनलाइन (UPI/Bank)'}
                </span>
              </div>

              {inc?.receiptNumber && (
                <div className="bg-white dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 col-span-2">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">पावती अनुक्रमांक</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                    {inc.receiptNumber}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* Download & WhatsApp Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>पावती डाउनलोड झाली!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-amber-300" />
                    <span>{downloading ? 'तयार करत आहे...' : 'पावती डाउनलोड करा'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp शेअर</span>
              </button>
            </div>

            {/* Add Next & View History Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {onAddNew && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAddNew();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl font-black text-xs shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>पुढील नोंद करा</span>
                </button>
              )}

              {onViewHistory ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewHistory();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <ListFilter className="w-4 h-4" />
                  <span>इतिहास पहा</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <span>ठीक आहे (Close)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
