import React from 'react';
import type { AccountInfo, Prices } from '../types';
import { getFullNumberString, smartFormatNumber, formatUSD } from '../utils/formatUtils';
import { knownAddressesCache } from '../services/knownAddresses';

interface AccountSummaryProps {
  accountInfo: AccountInfo;
  prices: Prices;
  t: (key: string) => string;
}

export const AccountSummary: React.FC<AccountSummaryProps> = ({ accountInfo, prices, t }) => {
  const [showAllObligations, setShowAllObligations] = React.useState(false);
  const [showAllAssets, setShowAllAssets] = React.useState(false);
  const accountLabel = knownAddressesCache[accountInfo.address];

  const assets = accountInfo.balances.filter(b => parseFloat(b.value) >= 0);
  const obligations = accountInfo.balances.filter(b => parseFloat(b.value) < 0);

  const displayedAssets = showAllAssets ? assets : assets.slice(0, 9);
  const hasMoreAssets = assets.length > 9;

  const displayedObligations = showAllObligations ? obligations : obligations.slice(0, 9);
  const hasMoreObligations = obligations.length > 9;

  const totalUsdValue = assets.reduce((acc, balance) => {
    const price = prices[balance.currency] || 0;
    const value = parseFloat(balance.value);
    return acc + value * price;
  }, 0);

  const renderBalanceCard = (balance: { currency: string; value: string; issuer?: string }) => {
    const price = prices[balance.currency] || 0;
    const value = parseFloat(balance.value);
    const displayValue = Math.abs(value);
    const usdValue = displayValue * price;
    const fullValueFormatted = getFullNumberString(value);
    const isXRP = balance.currency === 'XRP';

    return (
      <div key={balance.currency + balance.issuer} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-2xl font-bold text-xrp-blue">
          <span className="text-lg mr-2 font-medium text-gray-800 dark:text-gray-300">{balance.currency}</span>
          <span title={`${t('fullValue')}: ${fullValueFormatted}`}>
            {isXRP ? value.toFixed(6) : smartFormatNumber(displayValue)}
          </span>
        </p>
        <p className="text-sm text-green-600 dark:text-green-400">
          {price > 0 ? `~ ${formatUSD(usdValue)}` : ''}
        </p>
        {balance.issuer && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 truncate" title={balance.issuer}>
            {t('issuer')}: {balance.issuer}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg dark:shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="md:flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {accountLabel ? (
              <>
                <span className="text-xrp-blue">{accountLabel}</span>
                <span className="text-gray-400 font-normal">|</span>
              </>
            ) : null}
            {t('accountSummaryTitle')}
          </h2>
          <p className="text-sm font-mono break-all text-gray-500 dark:text-gray-400 mt-1">{accountInfo.address}</p>
        </div>
        <div className="mt-4 md:mt-0 text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('totalPortfolioValue')}</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{formatUSD(totalUsdValue)}</p>
        </div>
      </div>

      <div className="space-y-12">
        {assets.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('balances')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedAssets.map(renderBalanceCard)}
            </div>

            {hasMoreAssets && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowAllAssets(!showAllAssets)}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-gray-50 dark:bg-gray-900/80 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium text-xrp-blue transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {showAllAssets ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                      </svg>
                      {t('showLess')}
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                      {t('showAllBalances', { count: assets.length })}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {obligations.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              {t('obligations')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedObligations.map(renderBalanceCard)}
            </div>

            {hasMoreObligations && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowAllObligations(!showAllObligations)}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-gray-50 dark:bg-gray-900/80 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium text-xrp-blue transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {showAllObligations ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                      </svg>
                      {t('showLess')}
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                      {t('showAllObligations', { count: obligations.length })}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};