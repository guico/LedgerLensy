import React, { useEffect } from 'react';
import type { Prices, TracePath } from '../types';
import { smartFormatNumber, formatUSD } from '../utils/formatUtils';
import { SmartNumber } from './SmartNumber';

interface TraceFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  error: string | null;
  tracePath: TracePath | null;
  finalRecipient: string;
  finalRecipientBalance?: string;
  prices: Prices | null;
  onAddressClick: (address: string) => void;
  onTraceMore: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const ArrowDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
  </svg>
);

export const TraceFundsModal: React.FC<TraceFundsModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  error,
  tracePath,
  finalRecipient,
  finalRecipientBalance,
  prices,
  onAddressClick,
  onTraceMore,
  t
}) => {
  const hasMore = tracePath && tracePath.length > 0 && !!tracePath[0].nextFundingTxId;
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trace-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-xrp-blue/50 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="trace-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">{t('traceModalTitle')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
            aria-label={t('closeModal')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="p-6 overflow-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-xrp-blue mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">{t('tracingFunds')}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg" role="alert">
              <p><strong className="font-bold">{t('traceFailed')}:</strong> {error}</p>
            </div>
          )}

          {tracePath && (
            <div>
              <ul className="space-y-2">
                {hasMore && (
                  <li className="flex flex-col items-center mb-2">
                    <button
                      onClick={onTraceMore}
                      disabled={isLoading}
                      className="text-xs font-semibold text-xrp-blue hover:text-blue-700 bg-gray-50 dark:bg-gray-800/80 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-xrp-blue"></div>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      )}
                      {t('traceMore')}
                    </button>
                    <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                  </li>
                )}
                {tracePath.map((step, index) => (
                  <li key={step.txId} className="flex flex-col items-center">
                    <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 w-full text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('sender')}</p>
                      <button
                        onClick={() => onAddressClick(step.address)}
                        className="font-mono text-sm text-xrp-blue hover:underline break-all"
                      >
                        {step.address}
                      </button>
                      {step.balance !== undefined && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {t('balance')}: <span className="font-mono"><SmartNumber value={parseFloat(step.balance)} /> XRP</span>
                          {step.balanceUSD !== undefined && (
                            <span className="font-mono text-green-600 dark:text-green-400"> ({formatUSD(step.balanceUSD)})</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center my-2 text-gray-500 dark:text-gray-400">
                      <ArrowDownIcon className="w-5 h-5" />
                      <span className="ml-2 font-mono text-sm"><SmartNumber value={parseFloat(step.amount)} /> {step.currency}</span>
                    </div>
                  </li>
                ))}
                <li className="flex flex-col items-center">
                  <div className="bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-700 rounded-lg p-3 w-full text-center">
                    <p className="text-xs text-green-700 dark:text-green-300">{t('finalRecipient')}</p>
                    <p className="font-mono text-sm text-green-800 dark:text-green-200 break-all">{finalRecipient}</p>
                    {finalRecipientBalance !== undefined && (
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                        {t('balance')}: <span className="font-mono"><SmartNumber value={parseFloat(finalRecipientBalance)} /> XRP</span>
                        {prices?.['XRP'] && (
                          <span className="font-mono"> ({formatUSD(parseFloat(finalRecipientBalance) * prices['XRP'])})</span>
                        )}
                      </p>
                    )}
                  </div>
                </li>
              </ul>
              <p className="text-xs text-center mt-6 text-gray-500 dark:text-gray-500">
                {t('traceDisclaimer')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};