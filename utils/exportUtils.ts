import type { ProcessedTransaction } from '../types';

const escapeCsvCell = (cellData: string): string => {
  // If the cell data contains a comma, double quote, or newline, wrap it in double quotes.
  if (/[",\n]/.test(cellData)) {
    // Also, any double quotes within the string must be escaped by another double quote.
    return `"${cellData.replace(/"/g, '""')}"`;
  }
  return cellData;
};

export const exportTransactionsToCSV = (transactions: ProcessedTransaction[], t: (key: string, params?: Record<string, string | number>) => string) => {
  const headers = [
    t('csvTxId'),
    t('csvDate'),
    t('csvType'),
    t('csvDetails'),
    t('csvStatus'),
    t('csvFee'),
    t('csvCreditsCurrency'),
    t('csvCreditsAmount'),
    t('csvDebitsCurrency'),
    t('csvDebitsAmount'),
    t('csvXrpValue'),
  ];

  const csvRows = [headers.join(',')];

  for (const tx of transactions) {
    const creditChanges = tx.balanceChanges.filter(c => parseFloat(c.value) > 0);
    const debitChanges = tx.balanceChanges.filter(c => parseFloat(c.value) < 0);

    const creditCurrencies = creditChanges.map(c => c.currency).join(' | ');
    // Keep full precision for export
    const creditAmounts = creditChanges.map(c => c.value).join(' | ');

    const debitCurrencies = debitChanges.map(c => c.currency).join(' | ');
    // Keep full precision for export by removing the '-' sign via string manipulation
    // instead of float conversion, which can strip trailing zeros.
    const debitAmounts = debitChanges.map(c => c.value.startsWith('-') ? c.value.substring(1) : c.value).join(' | ');
    
    const detailsText = tx.detailsKey ? t(tx.detailsKey, tx.detailsParams) : tx.details;
      
    const row = [
      tx.id,
      tx.date,
      t(tx.type.toLowerCase()),
      detailsText,
      tx.result === 'tesSUCCESS' ? t('success') : t('failed'),
      tx.fee,
      creditCurrencies,
      creditAmounts,
      debitCurrencies,
      debitAmounts,
      tx.xrpValueUSD ? tx.xrpValueUSD.toFixed(4) : '',
    ].map(escapeCsvCell);
    
    csvRows.push(row.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'xrp-transactions.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};