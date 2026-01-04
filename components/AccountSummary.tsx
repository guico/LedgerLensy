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
  const accountLabel = knownAddressesCache[accountInfo.address];
  const totalUsdValue = accountInfo.balances.reduce((acc, balance) => {
    const price = prices[balance.currency] || 0;
    const value = parseFloat(balance.value);
    return acc + value * price;
  }, 0);

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

      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('balances')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accountInfo.balances.map(balance => {
            const price = prices[balance.currency] || 0;
            const value = parseFloat(balance.value);
            const usdValue = value * price;
            const fullValueFormatted = getFullNumberString(value);
            return (
              <div key={balance.currency + balance.issuer} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-2xl font-bold text-xrp-blue">
                  <span className="text-lg mr-2 font-medium text-gray-800 dark:text-gray-300">{balance.currency}</span>
                  <span title={`${t('fullValue')}: ${fullValueFormatted}`}>
                    {smartFormatNumber(value)}
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
            )
          })}
        </div>
      </div>
    </div>
  );
};