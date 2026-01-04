export interface Balance {
  currency: string;
  value: string;
  issuer?: string;
}

export interface AccountInfo {
  address: string;
  balances: Balance[];
}

export type BalanceChange = Balance;

export interface ProcessedTransaction {
  id: string; // hash
  date: string;
  type: string;
  details: string; // Fallback
  detailsKey: string;
  detailsParams: Record<string, string | number>;
  fee: string;
  balanceChanges: BalanceChange[];
  result: string;
  rawData: string;
  xrpPriceAtTx?: number;
  xrpValueUSD?: number;
}

export interface Prices {
  [currency: string]: number;
}

export interface TracePathItem {
  address: string;
  amount: string;
  currency: string;
  txId: string;
  balance?: string;
  balanceUSD?: number;
  nextFundingTxId?: string;
}
export type TracePath = TracePathItem[];