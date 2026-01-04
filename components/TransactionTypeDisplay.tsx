import React from 'react';
import {
  PaymentIcon,
  OfferCreateIcon,
  TrustSetIcon,
  OfferCancelIcon,
  AccountSetIcon,
  DefaultIcon,
} from './TransactionTypeIcons';

interface TransactionTypeDisplayProps {
  type: string;
  t: (key: string) => string;
}

export const TransactionTypeDisplay: React.FC<TransactionTypeDisplayProps> = ({ type, t }) => {
  let icon: React.ReactElement;
  let textClass: string;
  let bgClass: string;

  switch (type) {
    case 'Payment':
      icon = <PaymentIcon className="h-4 w-4" />;
      textClass = 'text-blue-800 dark:text-blue-300';
      bgClass = 'bg-blue-100 dark:bg-blue-900/70';
      break;
    case 'OfferCreate':
      icon = <OfferCreateIcon className="h-4 w-4" />;
      textClass = 'text-purple-800 dark:text-purple-300';
      bgClass = 'bg-purple-100 dark:bg-purple-900/70';
      break;
    case 'TrustSet':
      icon = <TrustSetIcon className="h-4 w-4" />;
      textClass = 'text-teal-800 dark:text-teal-300';
      bgClass = 'bg-teal-100 dark:bg-teal-900/70';
      break;
    case 'OfferCancel':
      icon = <OfferCancelIcon className="h-4 w-4" />;
      textClass = 'text-orange-800 dark:text-orange-300';
      bgClass = 'bg-orange-100 dark:bg-orange-900/70';
      break;
    case 'AccountSet':
      icon = <AccountSetIcon className="h-4 w-4" />;
      textClass = 'text-indigo-800 dark:text-indigo-300';
      bgClass = 'bg-indigo-100 dark:bg-indigo-900/70';
      break;
    default:
      icon = <DefaultIcon className="h-4 w-4" />;
      textClass = 'text-gray-800 dark:text-gray-300';
      bgClass = 'bg-gray-100 dark:bg-gray-700/70';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${bgClass} ${textClass}`}>
      {icon}
      <span>{t(type.toLowerCase())}</span>
    </span>
  );
};