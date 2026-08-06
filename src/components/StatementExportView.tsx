import React, { useState, useMemo } from 'react';
import { IncomeTransaction, ExpenseTransaction, CurrentUser } from '../types';
import { isCoreMemberRole } from '../utils/rbac';
import { RbacGuard } from './RbacGuard';
import {
  FileDown,
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  CheckCircle2,
  ArrowLeft,
  Share2,
  FileText,
} from 'lucide-react';
import moryaLogo from '../assets/morya_logo.jpg';

interface StatementExportViewProps {
  incomes: IncomeTransaction[];
  expenses: ExpenseTransaction[];
  financialYear: string;
  currentUser: CurrentUser;
  groupLogo?: string;
  onNavigate?: (tab: string) => void;
  onOpenLogin?: () => void;
}

export const StatementExportView: React.FC<StatementExportViewProps> = ({
  incomes,
  expenses,
  financialYear,
  currentUser,
  groupLogo,
  onNavigate,
  onOpenLogin,
}) => {
  const isLoggedIn = currentUser.isLoggedIn !== false;
  const isCoreMember = isLoggedIn && isCoreMemberRole(currentUser.role);

  // Filter States
  const [filterMode, setFilterMode] = useState<'YEAR' | 'CUSTOM'>('YEAR');
  const [selectedYear, setSelectedYear] = useState<string>(financialYear);
  const [fromDate, setFromDate] = useState<string>('2026-04-01');
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transactionType, setTransactionType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  if (!isCoreMember) {
    return (
      <RbacGuard
        currentRole={currentUser.role}
        title="स्टेटमेंट डाऊनलोड फक्त कोर कमिटीसाठी उपलब्ध"
        message="मंडळाचे एका वर्षाचे किंवा ठराविक कालावधीचे PDF व Excel स्टेटमेंट डाऊनलोड करण्याचा अधिकार केवळ कोर कमिटी पदाधिकारी (अध्यक्ष, खजिनदार, उपखजिनदार व ॲडमिन) यांनाच आहे."
        onLoginClick={onOpenLogin}
      />
    );
  }

  // Filtered Transactions Logic
  const filteredData = useMemo(() => {
    let inc = incomes;
    let exp = expenses.filter((e) => e.approvalStatus === 'मंजूर');

    if (filterMode === 'YEAR') {
      inc = inc.filter((i) => i.financialYear === selectedYear);
      exp = exp.filter((e) => e.financialYear === selectedYear);
    } else {
      inc = inc.filter((i) => {
        const d = i.dateStr;
        return d >= fromDate && d <= toDate;
      });
      exp = exp.filter((e) => {
        const d = e.expenseDate;
        return d >= fromDate && d <= toDate;
      });
    }

    const unifiedList: Array<{
      id: string;
      dateStr: string;
      type: 'जमा' | 'खर्च';
      category: string;
      reason: string;
      amount: number;
      personName: string;
      paymentMethod: string;
      receiptNumber?: string;
    }> = [];

    if (transactionType === 'ALL' || transactionType === 'INCOME') {
      inc.forEach((i) => {
        unifiedList.push({
          id: i.id,
          dateStr: i.dateStr,
          type: 'जमा',
          category: i.incomeType,
          reason: i.reason || i.incomeType,
          amount: i.amount,
          personName: i.depositorName,
          paymentMethod: i.paymentMethod,
          receiptNumber: i.receiptNumber,
        });
      });
    }

    if (transactionType === 'ALL' || transactionType === 'EXPENSE') {
      exp.forEach((e) => {
        unifiedList.push({
          id: e.id,
          dateStr: e.expenseDate,
          type: 'खर्च',
          category: e.expenseCategory,
          reason: e.reason,
          amount: e.amount,
          personName: e.recipientName,
          paymentMethod: e.paymentMethod,
          receiptNumber: e.receiptNumber || e.invoiceNumber,
        });
      });
    }

    // Sort chronologically by date
    unifiedList.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    return { unifiedList, inc, exp };
  }, [incomes, expenses, filterMode, selectedYear, fromDate, toDate, transactionType]);

  const totalIncome = filteredData.inc.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = filteredData.exp.reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Title description for statement
  const statementPeriodText =
    filterMode === 'YEAR'
      ? `आर्थिक वर्ष ${selectedYear}`
      : `कालावधी ${new Date(fromDate).toLocaleDateString('mr-IN')} ते ${new Date(
          toDate
        ).toLocaleDateString('mr-IN')}`;

  // Export CSV / Excel file
  const exportToExcelCSV = async () => {
    try {
      const escapeCsv = (val: any) => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = [
        ['अ क्र.', 'दिनांक', 'व्यवहार प्रकार', 'वर्गवारी / शीर्षक', 'कारण / तपशील', 'जमा रक्कम (₹)', 'खर्च रक्कम (₹)', 'व्यक्ति/पेयी नाव', 'पावती/पावती क्र.', 'व्यवहार पद्धत'],
      ];

      filteredData.unifiedList.forEach((item, index) => {
        rows.push([
          (index + 1).toString(),
          item.dateStr,
          item.type,
          escapeCsv(item.category),
          escapeCsv(item.reason),
          item.type === 'जमा' ? item.amount.toString() : '0',
          item.type === 'खर्च' ? item.amount.toString() : '0',
          escapeCsv(item.personName),
          escapeCsv(item.receiptNumber || '-'),
          escapeCsv(item.paymentMethod),
        ]);
      });

      // Summary totals row
      rows.push([]);
      rows.push(['', '', 'एकूण जमा (Total Deposit)', '', '', totalIncome.toString(), '', '', '', '']);
      rows.push(['', '', 'एकूण खर्च (Total Approved Expense)', '', '', '', totalExpense.toString(), '', '', '']);
      rows.push(['', '', 'निव्वळ शिल्लक बचत (Net Balance)', '', '', '', '', netBalance.toString(), '', '']);

      const csvString = rows.map((r) => r.join(',')).join('\r\n');
      const csvContent = '\uFEFF' + csvString;

      const filename = `MoryaGroup_Statement_${filterMode === 'YEAR' ? selectedYear : 'Custom'}_${Date.now()}.csv`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      // Try Native Web Share API first for mobile phones/apps
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'text/csv' })] })) {
        try {
          const file = new File([blob], filename, { type: 'text/csv' });
          await navigator.share({
            files: [file],
            title: `मोरया ग्रुप हिशोब स्टेटमेंट (${selectedYear})`,
            text: `मोरया ग्रुप मित्र मंडळ - अधिकृत हिशोब पत्रक (${statementPeriodText})`,
          });
          return;
        } catch {
          // ignore share cancel and proceed to standard download
        }
      }

      // Standard browser download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error('Excel export error:', err);
      alert('Excel/CSV डाऊनलोड करताना त्रुटी आली.');
    }
  };

  // Trigger PDF / Print Window
  const handlePrintPDF = () => {
    setShowPrintModal(true);
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.warn('Window print fallback:', e);
      }
    }, 400);
  };

  return (
    <>
    <h1 className="text-2xl font-black text-center text-amber-400 mb-4">मोरया ग्रुप मित्र मंडळ (ट्रस्ट)</h1>
    <div className="space-y-6 my-2">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-rose-950 to-orange-950 text-white p-6 rounded-3xl shadow-xl border border-amber-500/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border border-slate-700 font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1"
              title="मुख्य डॅशबोर्डवर परत जा (Exit)"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">← मुख्य पान</span>
            </button>
          )}
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center justify-center font-bold shrink-0">
            <FileDown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-md text-[11px] font-bold uppercase">
                कोर कमिटी अहवाल
              </span>
              <span className="text-xs text-amber-400 font-bold">• {currentUser.role} लॉगइन</span>
            </div>
            <h2 className="text-xl font-black mt-1 text-white">
              हिशोब पत्रक / स्टेटमेंट डाऊनलोड (PDF & Excel Statement)
            </h2>
            <p className="text-xs text-slate-300">
              एका संपूर्ण आर्थिक वर्षाचे किंवा इच्छित कालावधीचे अधिकृत जमा-खर्च स्टेटमेंट PDF / Excel मध्ये डाऊनलोड करा.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={exportToExcelCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel / CSV डाऊनलोड</span>
          </button>
          <button
            onClick={handlePrintPDF}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>PDF / प्रिंट काढ</span>
          </button>
        </div>
      </div>

      {/* Filter Selection Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-sm text-slate-800">स्टेटमेंट कालावधी व प्रकार निवडा</h3>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterMode('YEAR')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                filterMode === 'YEAR'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              एका आर्थिक वर्षाचे स्टेटमेंट
            </button>
            <button
              onClick={() => setFilterMode('CUSTOM')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                filterMode === 'CUSTOM'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ठराविक कालावधी निवडून (Custom Date)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          {filterMode === 'YEAR' ? (
            <div>
              <label className="block font-bold text-slate-700 mb-1">आर्थिक वर्ष निवडा</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="२०२६-२७">२०२६-२७ (चालू वर्ष)</option>
                <option value="२०२५-२६">२०२५-२६</option>
                <option value="२०२४-२५">२०२४-२५</option>
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">तारीख पासून (From Date)</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">तारीख पर्यंत (To Date)</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">व्यवहार प्रकार</label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as any)}
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="ALL">सर्व जमा व मंजूर खर्च (All Transactions)</option>
              <option value="INCOME">फक्त जमा रकमा (Income Only)</option>
              <option value="EXPENSE">फक्त मंजूर खर्च (Expenses Only)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
          <div className="flex justify-between items-center text-emerald-800">
            <span className="text-xs font-bold uppercase">एकूण जमा रक्कम</span>
            <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-1">
            ₹{totalIncome.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-emerald-700 font-bold">
            {filteredData.inc.length} जमा व्यवहार
          </span>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl">
          <div className="flex justify-between items-center text-rose-800">
            <span className="text-xs font-bold uppercase">एकूण मंजूर खर्च</span>
            <ArrowUpCircle className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-900 mt-1">
            ₹{totalExpense.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-rose-700 font-bold">
            {filteredData.exp.length} खर्च व्यवहार
          </span>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
          <div className="flex justify-between items-center text-amber-900">
            <span className="text-xs font-bold uppercase">निव्वळ शिल्लक बचत</span>
            <Wallet className="w-5 h-5 text-amber-600" />
          </div>
          <p
            className={`text-2xl font-black mt-1 ${
              netBalance >= 0 ? 'text-amber-950' : 'text-rose-700'
            }`}
          >
            ₹{netBalance.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-amber-800 font-bold">
            {statementPeriodText}
          </span>
        </div>

        <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl">
          <div className="flex justify-between items-center text-purple-900">
            <span className="text-xs font-bold uppercase">एकूण व्यवहार संख्या</span>
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-950 mt-1">
            {filteredData.unifiedList.length}
          </p>
          <span className="text-[10px] text-purple-800 font-bold">
            PDF/Excel साठी तयार
          </span>
        </div>
      </div>

      {/* Transaction List Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <span>विवरण तक्ता (Statement Table Preview)</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {filteredData.unifiedList.length} नोंदी
            </span>
          </h3>

          <div className="flex gap-2">
            <button
              onClick={exportToExcelCSV}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV / Excel</span>
            </button>
            <button
              onClick={handlePrintPDF}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF प्रिंट</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="p-3 font-bold">अ क्र.</th>
                <th className="p-3 font-bold">दिनांक</th>
                <th className="p-3 font-bold">प्रकार</th>
                <th className="p-3 font-bold">वर्गवारी / शीर्षक</th>
                <th className="p-3 font-bold">कारण / विवरण</th>
                <th className="p-3 font-bold text-right">जमा (₹)</th>
                <th className="p-3 font-bold text-right">खर्च (₹)</th>
                <th className="p-3 font-bold">नाव</th>
                <th className="p-3 font-bold">पावती क्र.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {filteredData.unifiedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 font-bold">
                    निवडलेल्या कालावधीमध्ये कोणतेही व्यवहार सापडले नाहीत.
                  </td>
                </tr>
              ) : (
                filteredData.unifiedList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="p-3 text-slate-500 font-bold">{idx + 1}</td>
                    <td className="p-3 font-mono text-[11px]">{item.dateStr}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                          item.type === 'जमा'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-800">{item.category}</td>
                    <td className="p-3 text-slate-600 max-w-[200px] truncate">{item.reason}</td>
                    <td className="p-3 text-right font-bold text-emerald-700">
                      {item.type === 'जमा' ? `₹${item.amount.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-rose-700">
                      {item.type === 'खर्च' ? `₹${item.amount.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="p-3">{item.personName}</td>
                    <td className="p-3 text-slate-500 font-mono text-[10px]">
                      {item.receiptNumber || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print / PDF Printable Overlay Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto p-8 print:p-0 print:bg-white text-slate-900 font-sans">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Action Bar (Hidden when printed) */}
            <div className="print:hidden flex justify-between items-center pb-4 border-b border-slate-200 bg-slate-100 p-4 rounded-2xl">
              <div>
                <h4 className="font-bold text-slate-800">PDF / प्रिंट पूर्वावलोकन (PDF Print Preview)</h4>
                <p className="text-xs text-slate-500">
                  कृपया Print Dialog मध्ये 'Save as PDF' पर्याय निवडून PDF सेव्ह करा.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer"
                >
                  🖨️ प्रिंट करा / Save PDF
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  बंद करा ✕
                </button>
              </div>
            </div>

            {/* Printable Document Sheet Header */}
            <div className="text-center space-y-2 border-b-2 border-slate-900 pb-4">
              <div className="flex justify-center items-center gap-3">
                <img
                  src={groupLogo || moryaLogo}
                  alt="लोगो"
                  className="w-16 h-16 object-contain rounded-full border border-amber-500 p-0.5 bg-slate-950"
                />
                <div className="text-left">
                  <h1 className="text-2xl font-black text-slate-900">
                    मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
                  </h1>
                  <p className="text-xs text-slate-600 font-bold">
                    हडपसर गोंधळनगर, पुणे • अधिकृत वार्षिक हिशोब पत्रक
                  </p>
                  <p className="text-xs font-bold text-amber-800 mt-0.5">
                    स्टेटमेंट प्रकार: {statementPeriodText}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-4 border border-slate-300 p-4 rounded-xl text-center text-xs font-bold bg-slate-50">
              <div>
                <p className="text-slate-500 uppercase text-[10px]">एकूण जमा (Total Deposit)</p>
                <p className="text-lg font-black text-emerald-800">
                  ₹{totalIncome.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-slate-500 uppercase text-[10px]">
                  एकूण मंजूर खर्च (Total Expense)
                </p>
                <p className="text-lg font-black text-rose-800">
                  ₹{totalExpense.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-slate-500 uppercase text-[10px]">निव्वळ शिल्लक बचत (Net Balance)</p>
                <p className="text-lg font-black text-amber-900">
                  ₹{netBalance.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Printable Transaction Table */}
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300">अ क्र.</th>
                  <th className="p-2 border-r border-slate-300">दिनांक</th>
                  <th className="p-2 border-r border-slate-300">प्रकार</th>
                  <th className="p-2 border-r border-slate-300">शीर्षक / कारण</th>
                  <th className="p-2 border-r border-slate-300 text-right">जमा (₹)</th>
                  <th className="p-2 border-r border-slate-300 text-right">खर्च (₹)</th>
                  <th className="p-2">व्यक्ति/पेयी नाव</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {filteredData.unifiedList.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-200">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-200 font-mono">{item.dateStr}</td>
                    <td className="p-2 border-r border-slate-200 font-bold">{item.type}</td>
                    <td className="p-2 border-r border-slate-200">{item.reason}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-bold text-emerald-800">
                      {item.type === 'जमा' ? item.amount.toLocaleString('en-IN') : '-'}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-bold text-rose-800">
                      {item.type === 'खर्च' ? item.amount.toLocaleString('en-IN') : '-'}
                    </td>
                    <td className="p-2">{item.personName}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Official Signature Footer */}
            <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs font-bold border-t border-slate-300">
              <div>
                <p className="border-t border-slate-400 pt-2 w-48 mx-auto font-black">
                  अध्यक्ष स्वाक्षरी
                </p>
                <p className="text-slate-500 text-[10px] mt-0.5">
                  मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
                </p>
              </div>
              <div>
                <p className="border-t border-slate-400 pt-2 w-48 mx-auto font-black">
                  खजिनदार स्वाक्षरी
                </p>
                <p className="text-slate-500 text-[10px] mt-0.5">
                  मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};
