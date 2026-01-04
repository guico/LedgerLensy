
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AccountInput } from './components/AccountInput';
import { AccountSummary } from './components/AccountSummary';
import { TransactionsTable } from './components/TransactionsTable';
import { getAccountInfo, getAccountTransactions, getTransactionDetails, getTraceStep } from './services/xrplService';
import { getPrices } from './services/cryptoPriceService';
import type { AccountInfo, ProcessedTransaction, Prices, TracePath } from './types';
import { AppLogo } from './components/AppLogo';
import { RawDataModal } from './components/RawDataModal';
import { TraceFundsModal } from './components/TraceFundsModal';
import { ThemeToggle } from './components/ThemeToggle';
import { useTranslations } from './hooks/useTranslations';
import { LanguageToggle } from './components/LanguageToggle';
import { subscribe, unsubscribe, loadWellKnownAddresses } from './services/knownAddresses';

// xrpl is loaded from CDN in index.html, declare it here for TypeScript
declare const xrpl: any;

const initialFilters = {
  type: '',
  details: '',
  status: '',
  dateRange: '',
  customStartDate: '',
  customEndDate: '',
  creditCurrency: '',
  debitCurrency: '',
};

// Pure function to filter transactions
const filterTransactions = (
  transactions: ProcessedTransaction[],
  filters: typeof initialFilters,
  t: (key: string, params?: Record<string, string | number>) => string
): ProcessedTransaction[] => {
  return transactions.filter(tx => {
    const typeMatch = filters.type ? t(tx.type.toLowerCase()) === filters.type : true;
    const detailsText = tx.detailsKey ? t(tx.detailsKey, tx.detailsParams) : tx.details;
    const detailsMatch = filters.details ? detailsText.toLowerCase().includes(filters.details.toLowerCase()) : true;
    const statusText = tx.result === 'tesSUCCESS' ? t('success') : t('failed');
    const statusMatch = filters.status ? statusText === filters.status : true;

    if (!typeMatch || !detailsMatch || !statusMatch) return false;

    if (filters.dateRange) {
      if (tx.date === 'N/A') return false;
      const txDate = new Date(tx.date);
      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      switch (filters.dateRange) {
        case 'today':
          startDate = today;
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          break;
        case 'yesterday':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 1);
          endDate = new Date(today);
          endDate.setMilliseconds(endDate.getMilliseconds() - 1);
          break;
        case 'thisWeek': {
          const dayOfWeek = today.getDay();
          const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          startDate = new Date(today.setDate(diffToMonday));
          endDate = now;
          break;
        }
        case 'lastWeek': {
          const dayOfWeek = today.getDay();
          const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          const startOfThisWeek = new Date(new Date(today).setDate(diffToMonday));
          endDate = new Date(startOfThisWeek);
          endDate.setMilliseconds(endDate.getMilliseconds() - 1);
          startDate = new Date(startOfThisWeek);
          startDate.setDate(startOfThisWeek.getDate() - 7);
          break;
        }
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = now;
          break;
        case 'lastMonth':
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          endDate.setHours(23, 59, 59, 999);
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        case 'custom':
          if (filters.customStartDate) {
            startDate = new Date(filters.customStartDate);
            startDate.setHours(0, 0, 0, 0);
          }
          if (filters.customEndDate) {
            endDate = new Date(filters.customEndDate);
            endDate.setHours(23, 59, 59, 999);
          }
          break;
      }
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;
    }

    if (filters.creditCurrency) {
      const hasCreditMatch = tx.balanceChanges.some(c =>
        parseFloat(c.value) > 0 &&
        c.currency === filters.creditCurrency
      );
      if (!hasCreditMatch) return false;
    }

    if (filters.debitCurrency) {
      const hasDebitMatch = tx.balanceChanges.some(c =>
        parseFloat(c.value) < 0 &&
        c.currency === filters.debitCurrency
      );
      if (!hasDebitMatch) return false;
    }

    return true;
  });
};

const App: React.FC = () => {
  const { lang, setLang, t } = useTranslations();
  const [input, setInput] = useState<string>('');
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [transactions, setTransactions] = useState<ProcessedTransaction[]>([]);
  const [prices, setPrices] = useState<Prices | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState<boolean>(false);
  const [marker, setMarker] = useState<object | undefined>();
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [selectedTxRawData, setSelectedTxRawData] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [viewMode, setViewMode] = useState<'welcome' | 'account' | 'transaction'>('welcome');
  const [isTraceModalOpen, setIsTraceModalOpen] = useState<boolean>(false);
  const [tracePath, setTracePath] = useState<TracePath | null>(null);
  const [isTracing, setIsTracing] = useState<boolean>(false);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [labelVersion, setLabelVersion] = useState(0);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme');
      if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
      }
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'dark';
  });

  useEffect(() => {
    const handleLabelUpdate = () => {
      setLabelVersion(v => v + 1);
    };
    subscribe(handleLabelUpdate);
    return () => unsubscribe(handleLabelUpdate);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.lang = lang;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark:bg-gray-900', 'dark:text-gray-100');
      document.body.classList.remove('bg-gray-100', 'text-gray-800');
    } else {
      root.classList.remove('dark');
      document.body.classList.add('bg-gray-100', 'text-gray-800');
      document.body.classList.remove('dark:bg-gray-900', 'dark:text-gray-100');
    }
    localStorage.setItem('theme', theme);
  }, [theme, lang]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleFilterChange = useCallback((filterName: string, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterName]: value };
      if (filterName === 'dateRange' && value !== 'custom') {
        newFilters.customStartDate = '';
        newFilters.customEndDate = '';
      }
      return newFilters;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const filteredTransactions = useMemo(() => {
    return filterTransactions(transactions, filters, t);
  }, [transactions, filters, t, labelVersion]);

  const availableTransactionTypes = useMemo(() => {
    const relevantTxs = filterTransactions(transactions, { ...filters, type: '' }, t);
    const types = new Set(relevantTxs.map(tx => t(tx.type.toLowerCase())));
    return Array.from(types).sort();
  }, [transactions, filters, t]);

  const availableCreditCurrencies = useMemo(() => {
    const relevantTxs = filterTransactions(transactions, { ...filters, creditCurrency: '' }, t);
    const currencies = new Set<string>();
    relevantTxs.forEach(tx => {
      tx.balanceChanges.forEach(change => {
        if (parseFloat(change.value) > 0) {
          currencies.add(change.currency);
        }
      });
    });
    return Array.from(currencies).sort();
  }, [transactions, filters, t]);

  const availableDebitCurrencies = useMemo(() => {
    const relevantTxs = filterTransactions(transactions, { ...filters, debitCurrency: '' }, t);
    const currencies = new Set<string>();
    relevantTxs.forEach(tx => {
      tx.balanceChanges.forEach(change => {
        if (parseFloat(change.value) < 0) {
          currencies.add(change.currency);
        }
      });
    });
    return Array.from(currencies).sort();
  }, [transactions, filters, t]);

  const availableStatuses = useMemo(() => {
    const relevantTxs = filterTransactions(transactions, { ...filters, status: '' }, t);
    const statuses = new Set(relevantTxs.map(tx => tx.result === 'tesSUCCESS' ? t('success') : t('failed')));
    return Array.from(statuses).sort();
  }, [transactions, filters, t]);

  const resetState = () => {
    setError(null);
    setAccountInfo(null);
    setTransactions([]);
    setMarker(undefined);
    setPrices(null);
    setFilters(initialFilters);
    setHasFetched(true);
  };

  const handleReset = useCallback(() => {
    setViewMode('welcome');
    setAccountInfo(null);
    setTransactions([]);
    setError(null);
    setMarker(undefined);
    setInput('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const fetchForAddress = useCallback(async (targetAddress: string) => {
    loadWellKnownAddresses(); // Ensure well-known addresses are loaded/updated
    setLoading(true);
    resetState();
    setViewMode('account');

    try {
      const priceDataPromise = getPrices();
      const accountInfoPromise = getAccountInfo(targetAddress);
      const transactionsPromise = getAccountTransactions(targetAddress);

      const [priceData, info, { transactions: txs, marker: newMarker }] = await Promise.all([
        priceDataPromise,
        accountInfoPromise,
        transactionsPromise,
      ]);

      setAccountInfo(info);
      setTransactions(txs);
      setMarker(newMarker);
      setPrices(priceData);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        if (err.message.includes('actNotFound')) {
          setError(t('error_actNotFound'));
        } else {
          setError(t('error_fetchAccount', { message: err.message }));
        }
      } else {
        setError(t('error_unknown'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchForTransaction = useCallback(async (hash: string) => {
    setLoading(true);
    resetState();
    setViewMode('transaction');

    try {
      const tx = await getTransactionDetails(hash);
      setTransactions([tx]);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(t('error_fetchTx', { message: err.message }));
      } else {
        setError(t('error_unknownTx'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleFetch = useCallback(() => {
    const trimmedInput = input.trim();
    if (!trimmedInput) {
      setError(t('error_enterAddress'));
      return;
    }

    if (xrpl.isValidAddress(trimmedInput)) {
      fetchForAddress(trimmedInput);
    } else if (/^[A-F0-9]{64}$/i.test(trimmedInput)) {
      fetchForTransaction(trimmedInput);
    } else {
      setError(t('error_invalidInput'));
    }
  }, [input, fetchForAddress, fetchForTransaction, t]);

  const handleAddressClick = useCallback((newAddress: string) => {
    setIsTraceModalOpen(false);
    setInput(newAddress);
    fetchForAddress(newAddress);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchForAddress]);

  const handleShowMore = useCallback(async () => {
    if (!marker || loadingMore || viewMode !== 'account' || !accountInfo) return;
    setLoadingMore(true);
    setError(null);
    try {
      const { transactions: newTxs, marker: newMarker } = await getAccountTransactions(accountInfo.address, marker);

      setTransactions(prevTxs => {
        const existingIds = new Set(prevTxs.map(tx => tx.id));
        const filteredNewTxs = newTxs.filter(tx => !existingIds.has(tx.id));
        return [...prevTxs, ...filteredNewTxs];
      });

      setMarker(newMarker);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(t('error_fetchMore', { message: err.message }));
      } else {
        setError(t('error_unknownMore'));
      }
    } finally {
      setLoadingMore(false);
    }
  }, [accountInfo, marker, loadingMore, viewMode, t]);

  const handleTraceFunds = useCallback(async (txId: string) => {
    if (!accountInfo?.address) {
      setTraceError(t('error_traceNoAccount'));
      setIsTraceModalOpen(true);
      return;
    };
    setIsTraceModalOpen(true);
    setIsTracing(true);
    setTraceError(null);
    setTracePath(null);
    try {
      const step = await getTraceStep(txId, prices);
      setTracePath([step]);
    } catch (err) {
      console.error("Tracing error:", err);
      const message = err instanceof Error ? err.message : t('error_unknownTrace');
      setTraceError(message);
    } finally {
      setIsTracing(false);
    }
  }, [accountInfo?.address, prices, t]);

  const handleTraceMore = useCallback(async () => {
    if (!tracePath || tracePath.length === 0 || isTracing) return;

    const furthestStep = tracePath[0];
    if (!furthestStep.nextFundingTxId) return;

    setIsTracing(true);
    setTraceError(null);
    try {
      const nextStep = await getTraceStep(furthestStep.nextFundingTxId, prices);
      setTracePath(prev => prev ? [nextStep, ...prev] : [nextStep]);
    } catch (err) {
      console.error("Tracing error:", err);
      const message = err instanceof Error ? err.message : t('error_unknownTrace');
      setTraceError(message);
    } finally {
      setIsTracing(false);
    }
  }, [tracePath, isTracing, prices, t]);

  const xrpBalance = accountInfo?.balances.find(b => b.currency === 'XRP')?.value;

  return (
    <>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans p-4 sm:p-6 lg:p-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <header className="flex items-center justify-between mb-8">
            <button
              onClick={handleReset}
              className="flex items-center space-x-3 text-left focus:outline-none transition-opacity hover:opacity-80"
            >
              <AppLogo className="h-12 w-12" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  LedgerLensy
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('appSubtitle')}</p>
              </div>
            </button>
            <div className="flex items-center space-x-3">
              <LanguageToggle lang={lang} setLang={setLang} />
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>
          </header>

          <main>
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg dark:shadow-2xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
              <AccountInput
                address={input}
                setAddress={setInput}
                onFetch={handleFetch}
                loading={loading}
                t={t}
              />
            </div>

            {loading && (
              <div className="flex justify-center items-center p-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-xrp-blue"></div>
              </div>
            )}

            {error && (
              <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative" role="alert">
                <strong className="font-bold">{t('error_prefix')}: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <div className="space-y-8">
              {viewMode === 'account' && !loading && !error && accountInfo && prices && (
                <AccountSummary accountInfo={accountInfo} prices={prices} t={t} />
              )}

              {transactions.length > 0 && !loading && (
                <TransactionsTable
                  transactions={filteredTransactions}
                  totalTransactions={transactions.length}
                  isSingleTxView={viewMode === 'transaction'}
                  availableTransactionTypes={availableTransactionTypes}
                  availableCreditCurrencies={availableCreditCurrencies}
                  availableDebitCurrencies={availableDebitCurrencies}
                  availableStatuses={availableStatuses}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClearFilters={handleClearFilters}
                  onAddressClick={handleAddressClick}
                  marker={marker}
                  onShowMore={handleShowMore}
                  loadingMore={loadingMore}
                  onShowRawData={setSelectedTxRawData}
                  onTraceFunds={handleTraceFunds}
                  t={t}
                />
              )}
            </div>

            {!loading && hasFetched && transactions.length === 0 && !error && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>{t('noData')}</p>
              </div>
            )}

            {viewMode === 'welcome' && (
              <div className="text-center py-16 px-6 bg-white dark:bg-gray-800/30 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('welcomeTitle')}</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">{t('welcomeMessage')}</p>
              </div>
            )}
          </main>

          <footer className="mt-16 pb-12 border-t border-gray-200 dark:border-gray-800 pt-8 text-center space-y-3">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wide">
              {t('footerText')} • <span className="opacity-75">{t('footerPoweredBy')}</span>
            </p>
            <p className="text-xs">
              <a
                href="https://github.com/guico/LedgerLensy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 dark:text-gray-500 hover:text-xrp-blue transition-colors duration-200 flex items-center justify-center gap-1"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                {t('footerSource')}
              </a>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Copyright (c) 2026 GuiCo
            </p>
          </footer>
        </div>
      </div>
      {selectedTxRawData && (
        <RawDataModal rawData={selectedTxRawData} onClose={() => setSelectedTxRawData(null)} t={t} />
      )}
      {isTraceModalOpen && (
        <TraceFundsModal
          isOpen={isTraceModalOpen}
          onClose={() => setIsTraceModalOpen(false)}
          isLoading={isTracing}
          error={traceError}
          tracePath={tracePath}
          finalRecipient={accountInfo?.address || ''}
          finalRecipientBalance={xrpBalance}
          prices={prices}
          onAddressClick={handleAddressClick}
          onTraceMore={handleTraceMore}
          t={t}
        />
      )}
    </>
  );
};

export default App;
