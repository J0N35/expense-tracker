import React, { useState, useEffect, useMemo } from 'react';
// i18n dictionary
const translations = {
  zh: {
    dashboard: '財務概覽',
    list: '交易明細',
    add: '記一筆',
    totalTransactions: '交易總數',
    totalExpense: '篩選總支出',
    avgMonthly: '平均每月支出',
    dailyTrend: '每日支出趨勢',
    filtered: '篩選',
    categoryBreakdown: '支出分佈',
    allTime: '所有時間',
    thisMonth: '本月',
    selectedMonth: '指定月份',
    filterResult: '篩選結果',
    records: '筆交易',
    date: '日期',
    category: '類別',
    note: '備註',
    amount: '金額',
    actions: '操作',
    edit: '編輯交易',
    addExpense: '新增支出',
    cancel: '取消',
    save: '儲存',
    update: '更新',
    noData: '此時段無數據',
    noRecords: '此時段內沒有任何交易紀錄',
    localData: '本地數據管理',
    loadSqlite: '載入 SQLite',
    saveDownload: '儲存並下載',
    exportExcel: '導出 Excel',
    currency: '貨幣：HKD',
    HKDE: 'HKD',
    confirmDelete: '確定要刪除此紀錄嗎？',
    placeholderNote: '備註...',
    type: '類型',
    expense: '支出',
    income: '收入',
    close: '關閉',
  },
  en: {
    dashboard: 'Dashboard',
    list: 'Transactions',
    add: 'Add',
    totalTransactions: 'Total Transactions',
    totalExpense: 'Total Expense (Filtered)',
    avgMonthly: 'Avg. Monthly Expense',
    dailyTrend: 'Daily Expense Trend',
    filtered: 'FILTERED',
    categoryBreakdown: 'Category Breakdown',
    allTime: 'All Time',
    thisMonth: 'This Month',
    selectedMonth: 'Selected Month',
    filterResult: 'Filtered',
    records: 'records',
    date: 'Date',
    category: 'Category',
    note: 'Note',
    amount: 'Amount',
    actions: 'Actions',
    edit: 'Edit Transaction',
    addExpense: 'Add Expense',
    cancel: 'Cancel',
    save: 'Save',
    update: 'Update',
    noData: 'No data for this period',
    noRecords: 'No transactions in this period',
    localData: 'Local Data Management',
    loadSqlite: 'Load SQLite',
    saveDownload: 'Save & Download',
    exportExcel: 'Export Excel',
    currency: 'Currency: HKD',
    HKDE: 'HKD',
    confirmDelete: 'Are you sure you want to delete this record?',
    placeholderNote: 'Note...',
    type: 'Type',
    expense: 'Expense',
    income: 'Income',
    close: 'Close',
  }
};

function useI18n() {
  const [lang, setLang] = useState('zh');
  const t = (key) => translations[lang][key] || key;
  return { t, lang, setLang };
}
import { 
  Plus, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  PieChart as PieChartIcon, 
  List, 
  Save, 
  Trash2,
  Edit2,
  AlertCircle,
  Database,
  TrendingUp,
  Calendar,
  X
} from 'lucide-react';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement,
  LineElement,
  Title,
  DoughnutController
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement,
  LineElement,
  Title,
  DoughnutController
);

const SESSION_KEY = 'expense_tracker_db';

const saveDbToSession = (targetDb) => {
  if (!targetDb) return;
  try {
    const data = targetDb.export();
    const base64 = btoa(Array.from(data).map(b => String.fromCharCode(b)).join(''));
    sessionStorage.setItem(SESSION_KEY, base64);
  } catch (e) {
    console.warn('Failed to cache DB to sessionStorage', e);
  }
};

let _saveDebounceTimer = null;
const debouncedSaveDbToSession = (targetDb) => {
  clearTimeout(_saveDebounceTimer);
  _saveDebounceTimer = setTimeout(() => saveDbToSession(targetDb), 500);
};

const loadDbFromSession = (SQL) => {
  try {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (!cached) return null;
    const binary = atob(cached);
    const bytes = new Uint8Array(binary.length);
    for (let byteIndex = 0; byteIndex < binary.length; byteIndex++) bytes[byteIndex] = binary.charCodeAt(byteIndex);
    return new SQL.Database(bytes);
  } catch (e) {
    console.warn('Failed to restore DB from sessionStorage', e);
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
};

const App = () => {
  const { t, lang, setLang } = useI18n();
  // State Management
  const [db, setDb] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [view, setView] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [libsReady, setLibsReady] = useState({ sql: false, xlsx: false });

  // Filters
  const [timeFilter, setTimeFilter] = useState('this-month'); // this-month, selected-month, all
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Form State
  const [formData, setFormData] = useState({
    amount: '',
    category: lang === 'zh' ? '餐飲' : 'Food',
    date: new Date().toISOString().split('T')[0],
    note: '',
    type: 'expense'
  });

  // Load External Libraries via CDN
  useEffect(() => {
    const sqlScript = document.createElement("script");
    sqlScript.src = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js";
    sqlScript.async = true;
    sqlScript.onload = () => {
      window.initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      }).then(SQL => {
        const restoredDb = loadDbFromSession(SQL);
        const initialDb = restoredDb || new SQL.Database();
        if (!restoredDb) {
          initialDb.run(`
            CREATE TABLE IF NOT EXISTS transactions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              amount REAL NOT NULL,
              category TEXT NOT NULL,
              date TEXT NOT NULL,
              note TEXT,
              type TEXT NOT NULL
            )
          `);
        }
        setDb(initialDb);
        setLibsReady(prev => ({ ...prev, sql: true }));
        refreshData(initialDb);
      });
    };

    const xlsxScript = document.createElement("script");
    xlsxScript.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    xlsxScript.async = true;
    xlsxScript.onload = () => setLibsReady(prev => ({ ...prev, xlsx: true }));

    document.body.appendChild(sqlScript);
    document.body.appendChild(xlsxScript);
  }, []);

  const refreshData = (targetDb) => {
    const activeDb = targetDb || db;
    if (!activeDb) return;
    try {
      const res = activeDb.exec("SELECT * FROM transactions ORDER BY date DESC");
      if (res.length > 0) {
        const columns = res[0].columns;
        const values = res[0].values;
        const formatted = values.map(row => {
          const obj = {};
          columns.forEach((col, i) => obj[col] = row[i]);
          return obj;
        });
        setTransactions(formatted);
      } else {
        setTransactions([]);
      }
    } catch (e) {
      console.error("Database query failed", e);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function() {
      const Uints = new Uint8Array(this.result);
      const SQL = await window.initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      });
      const newDb = new SQL.Database(Uints);
      setDb(newDb);
      setIsDbLoaded(true);
      refreshData(newDb);
      saveDbToSession(newDb);
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadDb = () => {
    if (!db) return;
    const data = db.export();
    const blob = new Blob([data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense_tracker_hkd_${new Date().toISOString().split('T')[0]}.sqlite`;
    a.click();
    setHasUnsavedChanges(false);
  };

  const handleSaveExpense = (e) => {
    e.preventDefault();
    if (!db) return;

    if (editingId) {
      db.run(
        "UPDATE transactions SET amount = ?, category = ?, date = ?, note = ?, type = ? WHERE id = ?",
        [formData.amount, formData.category, formData.date, formData.note, formData.type, editingId]
      );
    } else {
      db.run(
        "INSERT INTO transactions (amount, category, date, note, type) VALUES (?, ?, ?, ?, ?)",
        [formData.amount, formData.category, formData.date, formData.note, formData.type]
      );
    }
    
    refreshData();
    closeModal();
    setHasUnsavedChanges(true);
    debouncedSaveDbToSession(db);
  };

  const deleteRecord = (id) => {
    if (!db || !window.confirm(t('confirmDelete'))) return;
    db.run("DELETE FROM transactions WHERE id = ?", [id]);
    refreshData();
    setHasUnsavedChanges(true);
    debouncedSaveDbToSession(db);
  };

  const startEdit = (record) => {
    setEditingId(record.id);
    setFormData({
      amount: record.amount,
      category: record.category,
      date: record.date,
      note: record.note || '',
      type: record.type
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      amount: '',
      category: lang === 'zh' ? '餐飲' : 'Food',
      date: new Date().toISOString().split('T')[0],
      note: '',
      type: 'expense'
    });
  };

  const exportToExcel = () => {
    if (!window.XLSX) return;
    const worksheet = window.XLSX.utils.json_to_sheet(transactions);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    window.XLSX.writeFile(workbook, "expenses_hk_export.xlsx");
  };

  // --- Filtered Data ---
  const filteredTransactions = useMemo(() => {
    if (timeFilter === 'all') return transactions;
    
    const target = timeFilter === 'this-month' 
      ? new Date().toISOString().slice(0, 7) 
      : selectedMonth;
      
    return transactions.filter(t => t.date.startsWith(target));
  }, [transactions, timeFilter, selectedMonth]);

  // --- Analytics Logic ---
  
  // Donut Chart Logic (using filtered data)
  const categoryTotals = filteredTransactions.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {});

  const donutChartData = {
    labels: Object.keys(categoryTotals),
    datasets: [{
      data: Object.values(categoryTotals),
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'],
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 10
    }]
  };

  // Average Monthly Expense
  const avgMonthlyExpense = useMemo(() => {
    if (transactions.length === 0) return 0;
    const monthlyBuckets = transactions.reduce((acc, curr) => {
      const month = curr.date.slice(0, 7);
      acc[month] = (acc[month] || 0) + curr.amount;
      return acc;
    }, {});
    const totals = Object.values(monthlyBuckets);
    return totals.reduce((a, b) => a + b, 0) / totals.length;
  }, [transactions]);

  // Daily Trend Chart (filtered, with previous month compare)
  const getTrendChartData = () => {
    const daysInMonth = 31;
    const dayData = new Array(daysInMonth).fill(0);
    filteredTransactions.forEach(tx => {
      const d = new Date(tx.date);
      const day = d.getDate();
      dayData[day - 1] += tx.amount;
    });

    // Previous month logic
    let prevMonth = '';
    if (timeFilter === 'this-month' || timeFilter === 'selected-month') {
      const base = timeFilter === 'this-month' ? new Date().toISOString().slice(0, 7) : selectedMonth;
      const [y, m] = base.split('-').map(Number);
      const prev = m === 1 ? `${y - 1}-12` : `${y}-${(m - 1).toString().padStart(2, '0')}`;
      prevMonth = prev;
    }
    const prevMonthData = new Array(daysInMonth).fill(0);
    if (prevMonth) {
      transactions.filter(tx => tx.date.startsWith(prevMonth)).forEach(tx => {
        const d = new Date(tx.date);
        const day = d.getDate();
        prevMonthData[day - 1] += tx.amount;
      });
    }

    const datasets = [
      {
        label: t('dailyTrend'),
        data: dayData,
        backgroundColor: '#3B82F6',
        borderRadius: 6,
      }
    ];
    if (prevMonth && prevMonthData.some(v => v > 0)) {
      datasets.push({
        label: (lang === 'zh' ? '上月同期' : 'Previous Month'),
        data: prevMonthData,
        backgroundColor: '#CBD5E1',
        borderRadius: 6,
      });
    }
    return {
      labels: Array.from({length: daysInMonth}, (_, i) => i + 1),
      datasets
    };
  };

  if (!libsReady.sql) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">載入引擎中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Language Switcher */}
      <div className="absolute right-4 top-4 z-50">
        <button onClick={() => setLang('zh')} className={`px-3 py-1 rounded-l-lg font-bold text-xs ${lang === 'zh' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>繁體</button>
        <button onClick={() => setLang('en')} className={`px-3 py-1 rounded-r-lg font-bold text-xs ${lang === 'en' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>EN</button>
      </div>
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-8 flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-md">
            <Database className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-xl text-slate-800 leading-none tracking-tight">ExpTracker</h1>
            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">HK Edition</span>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-1.5">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${view === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
          >
            <PieChartIcon size={20} /> <span className="font-semibold">{t('dashboard')}</span>
          </button>
          <button 
            onClick={() => setView('list')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${view === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
          >
            <List size={20} /> <span className="font-semibold">{t('list')}</span>
          </button>
        </nav>

        <div className="p-6 border-t border-slate-100 space-y-2.5">
          <p className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('localData')}</p>
          <label className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-2xl cursor-pointer transition-colors">
            <Upload size={18} /> <span className="text-sm font-semibold">{t('loadSqlite')}</span>
            <input type="file" className="hidden" accept=".sqlite,.db" onChange={handleFileUpload} />
          </label>
          <button onClick={downloadDb} className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors relative">
            <Save size={18} /> <span className="text-sm font-semibold">{t('saveDownload')}</span>
            {hasUnsavedChanges && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-sm" />
            )}
          </button>
          <button onClick={exportToExcel} className="w-full flex items-center gap-3 px-4 py-3 text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-colors">
            <FileSpreadsheet size={18} /> <span className="text-sm font-semibold">{t('exportExcel')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto max-w-7xl mx-auto w-full">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {view === 'dashboard' ? t('dashboard') : t('list')}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-sm text-slate-500 font-medium italic">{t('currency')}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-bold shadow-xl shadow-blue-200 transition-all active:scale-95"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" /> {t('add')}
          </button>
        </header>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'this-month', label: t('thisMonth') },
              { id: 'selected-month', label: t('selectedMonth') },
              { id: 'all', label: t('allTime') }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setTimeFilter(f.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === f.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          
          {timeFilter === 'selected-month' && (
            <input 
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-xs font-bold text-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          )}
          
          <div className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={12} />
            {t('filterResult')}：{filteredTransactions.length} {t('records')}
          </div>
        </div>

        {view === 'dashboard' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('totalTransactions')}</p>
                <p className="text-2xl font-black text-slate-900">{filteredTransactions.length}</p>
              </div>
              <div className="bg-blue-600 p-6 rounded-3xl shadow-lg shadow-blue-100 text-white">
                <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">{t('totalExpense')}</p>
                <p className="text-2xl font-black">
                  HKD {filteredTransactions.reduce((s, t) => s + t.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-emerald-600 p-6 rounded-3xl shadow-lg shadow-emerald-100 text-white">
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-1">{t('avgMonthly')}</p>
                <p className="text-2xl font-black">
                  HKD {avgMonthlyExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Daily Trend (Filtered) */}
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-blue-600" size={20} />
                    <h3 className="font-bold text-slate-800">{t('dailyTrend')}</h3>
                  </div>
                  <div className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase">
                    {timeFilter === 'all' ? t('allTime') : (timeFilter === 'this-month' ? t('thisMonth') : selectedMonth)}
                  </div>
                </div>
                <div className="h-72">
                  <Bar 
                    data={getTrendChartData()} 
                    options={{ 
                      maintainAspectRatio: false, 
                      plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, usePointStyle: true, font: { size: 10, weight: 'bold' } } } },
                      scales: { y: { beginAtZero: true, grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } }
                    }} 
                  />
                </div>
              </div>

              {/* Category Breakdown (Donut) */}
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800">{t('categoryBreakdown')}</h3>
                  <div className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase">
                    {timeFilter === 'all' ? t('allTime') : (timeFilter === 'this-month' ? t('thisMonth') : selectedMonth)}
                  </div>
                </div>
                <div className="h-72 flex justify-center">
                  {filteredTransactions.length > 0 ? (
                    <Doughnut 
                      data={donutChartData} 
                      options={{ 
                        maintainAspectRatio: false, 
                        cutout: '70%',
                        plugins: { 
                          legend: { position: 'right', labels: { boxWidth: 10, padding: 15, font: { size: 11, weight: 'bold' } } } 
                        } 
                      }} 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <AlertCircle size={48} className="mb-2 opacity-20" />
                      <p className="text-sm font-medium">{t('noData')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('date')}</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('category')}</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('note')}</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">{t('amount')}</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-8 py-5 text-sm font-medium text-slate-600 font-mono">{tx.date}</td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider rounded-lg">
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-400 italic font-medium">{tx.note || '-'}</td>
                      <td className="px-8 py-5 text-sm font-black text-right text-slate-900 whitespace-nowrap">
                        <span className="text-[10px] text-slate-300 mr-1 font-normal">{t('HKDE')}</span>
                        {tx.amount.toLocaleString()}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(tx)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} aria-label={t('edit')} /></button>
                          <button onClick={() => deleteRecord(tx.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} aria-label={t('close')} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-8 py-20 text-center text-slate-300 font-medium italic">
                        {t('noRecords')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Entry / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingId ? t('edit') : t('addExpense')}</h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400" aria-label={t('close')}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t('amount')} (HKD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input autoFocus type="number" required step="0.1" className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-600 rounded-2xl font-black text-xl outline-none transition-all" value={formData.amount} onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || ''})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t('date')}</label>
                  <input type="date" required className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl text-sm font-bold outline-none" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t('category')}</label>
                  <select className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl text-sm font-bold outline-none cursor-pointer" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                    {(lang === 'zh' ? ['餐飲', '交通', '購物', '娛樂', '房租', '其他'] : ['Food', 'Transport', 'Shopping', 'Entertainment', 'Rent', 'Other']).map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <textarea className="w-full px-4 py-4 bg-slate-50 rounded-2xl text-sm font-medium outline-none" rows="2" placeholder={t('placeholderNote')} value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})}></textarea>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all">{t('cancel')}</button>
                <button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 transition-all">{editingId ? t('update') : t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;