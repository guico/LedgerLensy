import React, { useEffect } from 'react';
import type { DetailedBalanceChange } from '../types';
import { smartFormatNumber, getFullNumberString } from '../utils/formatUtils';
import { knownAddressesCache } from '../services/knownAddresses';

interface BalanceChangesModalProps {
    balanceChanges: DetailedBalanceChange[];
    onClose: () => void;
    onAddressClick: (address: string) => void;
    currentAccount?: string;
    t: (key: string, params?: Record<string, string | number>) => string;
}

export const BalanceChangesModal: React.FC<BalanceChangesModalProps> = ({ balanceChanges, onClose, onAddressClick, currentAccount, t }) => {
    // Close modal on escape key press
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-xrp-blue/50 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">{t('balanceChangesTitle')}</h2>
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
                <div className="p-0 overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">#</th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('account')}</th>
                                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('creditIn')}</th>
                                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('debitOut')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                            {balanceChanges.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                        {t('noData')}
                                    </td>
                                </tr>
                            ) : (
                                Object.entries(
                                    balanceChanges.reduce((acc, change) => {
                                        if (!acc[change.account]) acc[change.account] = [];
                                        acc[change.account].push(change);
                                        return acc;
                                    }, {} as Record<string, DetailedBalanceChange[]>)
                                ).map(([account, changes], index) => {
                                    const typedChanges = changes as DetailedBalanceChange[];
                                    const credits = typedChanges.filter(c => parseFloat(c.value) > 0);
                                    const debits = typedChanges.filter(c => parseFloat(c.value) < 0);
                                    const label = account === currentAccount ? t('analyzedAccount') : knownAddressesCache[account];

                                    return (
                                        <tr key={account} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 align-top">
                                            <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                                                {index + 1}
                                            </td>
                                            <td className="px-5 py-4 text-sm">
                                                <div className="flex flex-col">
                                                    {label && (
                                                        <span className={`font-semibold mb-0.5 ${account === currentAccount ? 'text-xrp-blue dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                                            {label}
                                                        </span>
                                                    )}
                                                    <a
                                                        href={`?address=${account}`}
                                                        onClick={(e) => {
                                                            if (!e.metaKey && !e.ctrlKey && e.button !== 1) {
                                                                e.preventDefault();
                                                                onAddressClick(account);
                                                            }
                                                        }}
                                                        onAuxClick={(e) => {
                                                            if (e.button === 1) {
                                                                // Browser will handle middle click on <a> naturally
                                                            }
                                                        }}
                                                        className="text-xrp-blue hover:underline text-left font-mono text-xs opacity-80 truncate max-w-[120px] sm:max-w-none block"
                                                        title={t('viewAccountDetails', { address: account })}
                                                    >
                                                        {account}
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-right font-mono text-green-600 dark:text-green-400">
                                                {credits.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {credits.map((c, i) => (
                                                            <div key={i} title={getFullNumberString(c.value)}>
                                                                {c.currency} {smartFormatNumber(parseFloat(c.value))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <span className="text-gray-300 dark:text-gray-700">-</span>}
                                            </td>
                                            <td className="px-5 py-4 text-sm text-right font-mono text-red-600 dark:text-red-400">
                                                {debits.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {debits.map((c, i) => (
                                                            <div key={i} title={getFullNumberString(c.value)}>
                                                                {c.currency} {smartFormatNumber(Math.abs(parseFloat(c.value)))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <span className="text-gray-300 dark:text-gray-700">-</span>}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
