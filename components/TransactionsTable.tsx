import React, { useState, useEffect, useRef } from 'react';
import type { ProcessedTransaction } from '../types';
import { exportTransactionsToCSV } from '../utils/exportUtils';
import { TransactionTypeDisplay } from './TransactionTypeDisplay';
import { getFullNumberString, smartFormatNumber, formatUSD } from '../utils/formatUtils';
import { SmartNumber } from './SmartNumber';
import { knownAddressesCache } from '../services/knownAddresses';

const ArrowUpRightIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
  </svg>
);

const ArrowDownLeftIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25" />
  </svg>
);

const CodeBracketIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
  </svg>
);

const TraceIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
);


const DownloadIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const CurrencyDollarIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const FunnelIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.572a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
  </svg>
);

const DetailRenderer: React.FC<{ onAddressClick: (address: string) => void, t: (key: string, params?: Record<string, string | number>) => string, tx: ProcessedTransaction }> = ({ onAddressClick, t, tx }) => {
  const address = tx.detailsParams?.address as string | undefined;

  // On each render, check the global cache for the latest label.
  const cachedLabel = address ? knownAddressesCache[address] : undefined;

  // Use the cached label if it exists, otherwise fallback to the one in the tx object (if any).
  const label = cachedLabel || (tx.detailsParams?.label as string | undefined);

  // Re-generate the detail text with the latest label if available.
  // If we have a label and the key isn't already the "known" variant, try to use the known variant.
  let currentKey = tx.detailsKey;
  if (label && currentKey && !currentKey.endsWith('_known')) {
    const knownKey = `${currentKey}_known`;
    // We check if the translation exists by seeing if t() returns something other than the key itself
    if (t(knownKey) !== knownKey) {
      currentKey = knownKey;
    }
  }

  const detailText = currentKey ? t(currentKey, { ...tx.detailsParams, label: label || tx.detailsParams.address }) : tx.details;

  // Render a special view for transactions with a known counterparty label
  if (address && label) {
    // We need to handle cases where the label might be inside the translated string.
    const textParts = detailText.split(label);
    return (
      <span>
        {textParts[0]}
        <strong className="font-semibold text-gray-900 dark:text-gray-100">{label}</strong>
        {textParts[1]}
        <button
          onClick={() => onAddressClick(address)}
          className="text-xrp-blue hover:underline focus:outline-none focus:underline ml-1.5 font-mono text-xs opacity-80"
          title={t('viewAccountDetails', { address: address })}
        >
          ({address.substring(0, 6)}...)
        </button>
      </span>
    );
  }

  // Fallback to original implementation for other cases (e.g., non-address details)
  const addressRegex = /(r[1-9A-HJ-NP-Za-km-z]{25,34})/;
  const parts = detailText.split(addressRegex);

  return (
    <>
      {parts.map((part, index) => {
        if (addressRegex.test(part)) {
          return (
            <a
              key={index}
              href={`?address=${part}`}
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && e.button !== 1) {
                  e.preventDefault();
                  onAddressClick(part);
                }
              }}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  // Browser will handle middle click on <a> naturally
                }
              }}
              className="text-xrp-blue hover:underline focus:outline-none focus:underline"
              title={t('viewAccountDetails', { address: part })}
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};


interface TransactionsTableProps {
  transactions: ProcessedTransaction[];
  totalTransactions: number;
  isSingleTxView: boolean;
  availableTransactionTypes: string[];
  availableCreditCurrencies: string[];
  availableDebitCurrencies: string[];
  availableStatuses: string[];
  filters: {
    type: string;
    details: string;
    status: string;
    dateRange: string;
    customStartDate: string;
    customEndDate: string;
    creditCurrency: string;
    debitCurrency: string;
  };
  onFilterChange: (filterName: string, value: string) => void;
  onClearFilters: () => void;
  onAddressClick: (address: string) => void;
  marker?: object;
  onShowMore: () => void;
  loadingMore: boolean;
  onShowRawData: (rawData: string) => void;
  onTraceFunds: (txId: string) => void;
  onShowBalanceChanges: (tx: ProcessedTransaction) => void;
  onTransactionClick: (hash: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const FilterInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-xrp-blue focus:border-xrp-blue transition-colors"
  />
);
const FilterSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-xrp-blue focus:border-xrp-blue transition-colors"
  >
    {props.children}
  </select>
);

const FilterControls: React.FC<Pick<TransactionsTableProps, 'filters' | 'onFilterChange' | 'availableTransactionTypes' | 'availableCreditCurrencies' | 'availableDebitCurrencies' | 'availableStatuses' | 't'>> = ({ filters, onFilterChange, availableTransactionTypes, availableCreditCurrencies, availableDebitCurrencies, availableStatuses, t }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('date')}</label>
      <div className="flex flex-col gap-1">
        <FilterSelect value={filters.dateRange} onChange={e => onFilterChange('dateRange', e.target.value)}>
          <option value="">{t('allTime')}</option>
          <option value="today">{t('today')}</option>
          <option value="yesterday">{t('yesterday')}</option>
          <option value="thisWeek">{t('thisWeek')}</option>
          <option value="lastWeek">{t('lastWeek')}</option>
          <option value="thisMonth">{t('thisMonth')}</option>
          <option value="lastMonth">{t('lastMonth')}</option>
          <option value="custom">{t('customRange')}</option>
        </FilterSelect>
        {filters.dateRange === 'custom' && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
            <FilterInput type="date" value={filters.customStartDate} onChange={e => onFilterChange('customStartDate', e.target.value)} aria-label={t('startDate')} />
            <span>{t('to')}</span>
            <FilterInput type="date" value={filters.customEndDate} onChange={e => onFilterChange('customEndDate', e.target.value)} aria-label={t('endDate')} />
          </div>
        )}
      </div>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('type')}</label>
      <FilterSelect value={filters.type} onChange={e => onFilterChange('type', e.target.value)}>
        <option value="">{t('allTypes')}</option>
        {availableTransactionTypes.map(type => <option key={type} value={type}>{type}</option>)}
      </FilterSelect>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('details')}</label>
      <FilterInput type="text" placeholder={t('filterDetails')} value={filters.details} onChange={e => onFilterChange('details', e.target.value)} />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('status')}</label>
      <FilterSelect value={filters.status} onChange={e => onFilterChange('status', e.target.value)}>
        <option value="">{t('all')}</option>
        {availableStatuses.map(status => <option key={status} value={status}>{status}</option>)}
      </FilterSelect>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('creditCurrency')}</label>
      <FilterSelect value={filters.creditCurrency} onChange={e => onFilterChange('creditCurrency', e.target.value)}>
        <option value="">{t('all')}</option>
        {availableCreditCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
      </FilterSelect>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('debitCurrency')}</label>
      <FilterSelect value={filters.debitCurrency} onChange={e => onFilterChange('debitCurrency', e.target.value)}>
        <option value="">{t('all')}</option>
        {availableDebitCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
      </FilterSelect>
    </div>
  </div>
);


export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  totalTransactions,
  isSingleTxView,
  availableTransactionTypes,
  availableCreditCurrencies,
  availableDebitCurrencies,
  availableStatuses,
  filters,
  onFilterChange,
  onClearFilters,
  onAddressClick,
  marker,
  onShowMore,
  loadingMore,
  onShowRawData,
  onTraceFunds,
  onShowBalanceChanges,
  onTransactionClick,
  t
}) => {
  const [isMobileFiltersVisible, setIsMobileFiltersVisible] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSingleTxView || !marker || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          onShowMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [marker, loadingMore, onShowMore, isSingleTxView]);

  const handleExport = () => {
    exportTransactionsToCSV(transactions, t); // Pass the filtered list and translator
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  const filterProps = { filters, onFilterChange, availableTransactionTypes, availableCreditCurrencies, availableDebitCurrencies, availableStatuses, t };

  return (
    <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg dark:shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isSingleTxView ? t('txDetailsTitle') : t('txHistoryTitle')}
          </h2>
          {!isSingleTxView && totalTransactions > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {transactions.length === totalTransactions
                ? t('showingAllTransactions', { count: transactions.length })
                : t('showingTransactions', { count: transactions.length, total: totalTransactions })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {!isSingleTxView && hasActiveFilters && (
            <button onClick={onClearFilters} className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-yellow-500 transition-colors">
              <XCircleIcon className="w-4 h-4" />
              {t('clear')}
            </button>
          )}
          {transactions.length > 0 && (
            <button
              onClick={handleExport}
              title={t('exportTooltip')}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-xrp-blue transition-colors"
            >
              <DownloadIcon className="w-4 h-4" />
              {t('export')}
            </button>
          )}
          {!isSingleTxView && (
            <button onClick={() => setIsMobileFiltersVisible(!isMobileFiltersVisible)} className="md:hidden inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-xrp-blue transition-colors">
              <FunnelIcon className="w-4 h-4" />
              {t('filters')}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Filters */}
      {!isSingleTxView && isMobileFiltersVisible && (
        <div className="md:hidden p-4 border-t border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <FilterControls {...filterProps} />
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full lg:min-w-[1200px] divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 sm:pl-6">{t('date')}</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">{t('type')}</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">{t('details')}</th>
              <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">{t('creditIn')}</th>
              <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">{t('debitOut')}</th>
              <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">{t('feeXRP')}</th>
              <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">{t('xrpRate')}</th>
              <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">{t('status')}</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]">{t('actions')}</th>
            </tr>
            {!isSingleTxView && (
              <tr className="bg-gray-100/50 dark:bg-gray-800/50">
                <th className="p-2 pl-4 pr-3 sm:pl-6 align-top">
                  <div className="flex flex-col gap-1">
                    <FilterSelect value={filters.dateRange} onChange={e => onFilterChange('dateRange', e.target.value)}>
                      <option value="">{t('allTime')}</option>
                      <option value="today">{t('today')}</option>
                      <option value="yesterday">{t('yesterday')}</option>
                      <option value="thisWeek">{t('thisWeek')}</option>
                      <option value="lastWeek">{t('lastWeek')}</option>
                      <option value="thisMonth">{t('thisMonth')}</option>
                      <option value="lastMonth">{t('lastMonth')}</option>
                      <option value="custom">{t('customRange')}</option>
                    </FilterSelect>
                    {filters.dateRange === 'custom' && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <FilterInput type="date" value={filters.customStartDate} onChange={e => onFilterChange('customStartDate', e.target.value)} aria-label={t('startDate')} />
                        <span>{t('to')}</span>
                        <FilterInput type="date" value={filters.customEndDate} onChange={e => onFilterChange('customEndDate', e.target.value)} aria-label={t('endDate')} />
                      </div>
                    )}
                  </div>
                </th>
                <th className="p-2 text-left align-top"><FilterSelect value={filters.type} onChange={e => onFilterChange('type', e.target.value)}><option value="">{t('all')}</option>{availableTransactionTypes.map(type => <option key={type} value={type}>{type}</option>)}</FilterSelect></th>
                <th className="p-2 text-left align-top"><FilterInput type="text" placeholder={t('filter') + '...'} value={filters.details} onChange={e => onFilterChange('details', e.target.value)} /></th>
                <th className="p-2 align-top"><FilterSelect value={filters.creditCurrency} onChange={e => onFilterChange('creditCurrency', e.target.value)}><option value="">{t('all')}</option>{availableCreditCurrencies.map(c => <option key={c} value={c}>{c}</option>)}</FilterSelect></th>
                <th className="p-2 align-top"><FilterSelect value={filters.debitCurrency} onChange={e => onFilterChange('debitCurrency', e.target.value)}><option value="">{t('all')}</option>{availableDebitCurrencies.map(c => <option key={c} value={c}>{c}</option>)}</FilterSelect></th>
                <th className="align-top"></th>
                <th className="align-top"></th>
                <th className="p-2 text-center align-top"><FilterSelect value={filters.status} onChange={e => onFilterChange('status', e.target.value)}><option value="">{t('all')}</option>{availableStatuses.map(status => <option key={status} value={status}>{status}</option>)}</FilterSelect></th>
                <th className="relative py-2 pl-3 pr-4 sm:pr-6 align-top"></th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900/50">
            {transactions.map((tx) => {
              const credits = tx.balanceChanges.filter(c => parseFloat(c.value) > 0);
              const debits = tx.balanceChanges.filter(c => parseFloat(c.value) < 0);
              const displayDate = tx.date !== 'N/A' ? new Date(tx.date).toLocaleString(t('locale'), { year: '2-digit', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A';
              const isDebitTx = debits.length > 0 && credits.length === 0;
              const isIncomingPayment = tx.type === 'Payment' && credits.length > 0;

              return (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors duration-150">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 dark:text-gray-400 sm:pl-6" title={tx.date}>{displayDate}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <div className="flex flex-col">
                      <TransactionTypeDisplay type={tx.type} t={t} />
                      <a
                        href={`?tx=${tx.id}`}
                        onClick={(e) => {
                          if (!e.metaKey && !e.ctrlKey && e.button !== 1) {
                            e.preventDefault();
                            onTransactionClick(tx.id);
                          }
                        }}
                        className="text-[10px] font-mono text-gray-400 dark:text-gray-500 hover:text-xrp-blue mt-1 hover:underline truncate w-16"
                        title={tx.id}
                      >
                        {tx.id.substring(0, 8)}...
                      </a>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-800 dark:text-gray-300 max-w-md min-w-[250px]"><div className="flex items-center">{!isDebitTx ? <ArrowDownLeftIcon className="h-4 w-4 mr-2 text-green-500 dark:text-green-400 flex-shrink-0" /> : <ArrowUpRightIcon className="h-4 w-4 mr-2 text-red-500 dark:text-red-400 flex-shrink-0" />}<span className="font-mono" title={t(tx.detailsKey, tx.detailsParams)}><DetailRenderer tx={tx} onAddressClick={onAddressClick} t={t} /></span></div></td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-mono text-green-600 dark:text-green-400">{credits.map((change, index) => {
                    const val = parseFloat(change.value);
                    return (<div key={index}><span className="text-gray-500 dark:text-gray-300 text-xs mr-1 font-sans font-semibold">{change.currency}</span><span title={`${t('fullValue')}: ${getFullNumberString(val)}`}><SmartNumber value={val} /></span></div>)
                  })}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-mono text-red-600 dark:text-red-400">{debits.map((change, index) => {
                    const val = Math.abs(parseFloat(change.value));
                    return (<div key={index}><span className="text-gray-500 dark:text-gray-300 text-xs mr-1 font-sans font-semibold">{change.currency}</span><span title={`${t('fullValue')}: ${getFullNumberString(val)}`}><SmartNumber value={val} /></span></div>)
                  })}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-mono text-gray-500 dark:text-gray-500"><span title={`${t('fullValue')}: ${getFullNumberString(tx.fee)}`}><SmartNumber value={parseFloat(tx.fee)} /></span></td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-mono text-gray-500 dark:text-gray-400">
                    {tx.xrpPriceAtTx !== undefined && tx.xrpValueUSD !== undefined ? (
                      <span title={`${t('totalValue')}: ${formatUSD(tx.xrpValueUSD)}`}>
                        {formatUSD(tx.xrpPriceAtTx)}
                      </span>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm text-gray-500 dark:text-gray-400">{tx.result === 'tesSUCCESS' ? <span className="inline-flex items-center rounded-md bg-green-100 text-green-800 dark:bg-green-900/70 px-2 py-1 text-xs font-medium dark:text-green-300">{t('success')}</span> : <span className="inline-flex items-center rounded-md bg-yellow-100 text-yellow-800 dark:bg-yellow-900/70 px-2 py-1 text-xs font-medium dark:text-yellow-300" title={tx.result}>{t('failed')}</span>}</td>
                  <td className="whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-6 min-w-[120px]">
                    <div className="flex items-center justify-center gap-3">
                      {isIncomingPayment && (
                        <button onClick={() => onTraceFunds(tx.id)} className="text-gray-500 dark:text-gray-400 hover:text-xrp-blue transition-colors" title={t('tracePaymentOrigin')}>
                          <TraceIcon className="h-5 w-5" />
                        </button>
                      )}
                      {tx.allBalanceChanges && tx.allBalanceChanges.length > 1 && (
                        <button onClick={() => onShowBalanceChanges(tx)} className="text-gray-500 dark:text-gray-400 hover:text-xrp-blue transition-colors" title={t('viewBalanceChanges')}>
                          <CurrencyDollarIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button onClick={() => onShowRawData(tx.rawData)} className="text-gray-500 dark:text-gray-400 hover:text-xrp-blue transition-colors" title={t('viewRawData')}>
                        <CodeBracketIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(transactions.length === 0) && <p className="text-center py-12 text-gray-500 dark:text-gray-500">{totalTransactions > 0 ? t('noTxMatchFilter') : t('noTxFound')}</p>}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden">
        <div className="px-4 py-2 space-y-4">
          {transactions.map(tx => {
            const credits = tx.balanceChanges.filter(c => parseFloat(c.value) > 0);
            const debits = tx.balanceChanges.filter(c => parseFloat(c.value) < 0);
            const displayDate = tx.date !== 'N/A' ? new Date(tx.date).toLocaleString(t('locale'), { year: '2-digit', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A';
            const isDebitTx = debits.length > 0 && credits.length === 0;
            const isIncomingPayment = tx.type === 'Payment' && credits.length > 0;

            return (
              <div key={tx.id} className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-lg border border-gray-200 dark:border-gray-700/50 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <TransactionTypeDisplay type={tx.type} t={t} />
                    <a
                      href={`?tx=${tx.id}`}
                      onClick={(e) => {
                        if (!e.metaKey && !e.ctrlKey && e.button !== 1) {
                          e.preventDefault();
                          onTransactionClick(tx.id);
                        }
                      }}
                      className="text-[10px] font-mono text-gray-400 dark:text-gray-500 hover:text-xrp-blue mt-1 hover:underline w-16"
                      title={tx.id}
                    >
                      {tx.id.substring(0, 8)}...
                    </a>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{displayDate}</span>
                </div>
                {tx.result === 'tesSUCCESS' ? <span className="inline-flex items-center rounded-md bg-green-100 text-green-800 dark:bg-green-900/70 px-2 py-1 text-xs font-medium dark:text-green-300">{t('success')}</span> : <span className="inline-flex items-center rounded-md bg-yellow-100 text-yellow-800 dark:bg-yellow-900/70 px-2 py-1 text-xs font-medium dark:text-yellow-300" title={tx.result}>{t('failed')}</span>}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('details')}</p>
                  <div className="flex items-center text-sm text-gray-800 dark:text-gray-300">
                    {!isDebitTx ? <ArrowDownLeftIcon className="h-4 w-4 mr-2 text-green-500 dark:text-green-400 flex-shrink-0" /> : <ArrowUpRightIcon className="h-4 w-4 mr-2 text-red-500 dark:text-red-400 flex-shrink-0" />}
                    <p className="font-mono break-all" title={t(tx.detailsKey, tx.detailsParams)}><DetailRenderer tx={tx} onAddressClick={onAddressClick} t={t} /></p>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700/50 pt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('creditIn')}</p>
                    <div className="font-mono text-green-600 dark:text-green-400">
                      {credits.length > 0 ? credits.map((c, i) => {
                        const val = parseFloat(c.value);
                        return <div key={i}><span className="text-gray-500 dark:text-gray-300 text-xs mr-1 font-sans font-semibold">{c.currency}</span><span title={`${t('fullValue')}: ${getFullNumberString(val)}`}><SmartNumber value={val} /></span></div>
                      }) : <span className="text-gray-400 dark:text-gray-500">-</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('debitOut')}</p>
                    <div className="font-mono text-red-600 dark:text-red-400">
                      {debits.length > 0 ? debits.map((c, i) => {
                        const val = Math.abs(parseFloat(c.value));
                        return <div key={i}><span className="text-gray-500 dark:text-gray-300 text-xs mr-1 font-sans font-semibold">{c.currency}</span><span title={`${t('fullValue')}: ${getFullNumberString(val)}`}><SmartNumber value={val} /></span></div>
                      }) : <span className="text-gray-400 dark:text-gray-500">-</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('feeXRP')}</p>
                    <p className="font-mono text-gray-500 dark:text-gray-500">
                      <span title={`${t('fullValue')}: ${getFullNumberString(tx.fee)}`}><SmartNumber value={parseFloat(tx.fee)} /></span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('xrpRate')}</p>
                    <p className="font-mono text-gray-500 dark:text-gray-400">
                      {tx.xrpPriceAtTx !== undefined && tx.xrpValueUSD !== undefined ? (
                        <span title={`${t('totalValue')}: ${formatUSD(tx.xrpValueUSD)}`}>
                          {formatUSD(tx.xrpPriceAtTx)}
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                    </p>
                  </div>
                  <div className="flex justify-end items-end col-start-2 gap-3">
                    {isIncomingPayment && (
                      <button onClick={() => onTraceFunds(tx.id)} className="text-gray-500 dark:text-gray-400 hover:text-xrp-blue transition-colors" title={t('tracePaymentOrigin')}>
                        <TraceIcon className="h-5 w-5" />
                      </button>
                    )}
                    {tx.allBalanceChanges && tx.allBalanceChanges.length > 1 && (
                      <button onClick={() => onShowBalanceChanges(tx)} className="text-gray-500 dark:text-gray-400 hover:text-xrp-blue transition-colors" title={t('viewBalanceChanges')}>
                        <CurrencyDollarIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button onClick={() => onShowRawData(tx.rawData)} className="text-gray-500 dark:text-gray-400 hover:text-xrp-blue transition-colors" title={t('viewRawData')}>
                      <CodeBracketIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {(transactions.length === 0) && <p className="text-center py-12 text-gray-500 dark:text-gray-500">{totalTransactions > 0 ? t('noTxMatchFilter') : t('noTxFound')}</p>}
        </div>
      </div>


      {!isSingleTxView && marker && (
        <div ref={loaderRef} className="p-6 text-center border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onShowMore}
            disabled={loadingMore}
            className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-xrp-blue/90 hover:bg-xrp-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-xrp-blue disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loadingMore ? t('loading') : t('showMore')}
          </button>
        </div>
      )}
    </div>
  );
};