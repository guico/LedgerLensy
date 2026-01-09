import type { AccountInfo, ProcessedTransaction, Balance, BalanceChange, DetailedBalanceChange, TracePathItem, TracePath, Prices } from '../types';
import { knownAddressesCache } from './knownAddresses';

// xrpl is loaded from CDN in index.html, declare it here for TypeScript
declare const xrpl: any;

const SERVERS = [
    'wss://s1.ripple.com',
    'wss://s2.ripple.com',
    'wss://xrpl.ws'
];

let currentServerIndex = 0;
let client = new xrpl.Client(SERVERS[currentServerIndex], { connectionTimeout: 10000 });

const DROPS_PER_XRP = 1000000;
const USD_LIKE_CURRENCIES = ['USD', 'RLUSD'];

const connectClient = async () => {
    if (client.isConnected()) {
        return;
    }

    // Attempt to connect to the current server
    try {
        await client.connect();
        return;
    } catch (err) {
        console.warn(`Failed to connect to ${SERVERS[currentServerIndex]}. Trying fallback servers...`, err);
    }

    // Iterate through fallback servers
    for (let i = 0; i < SERVERS.length; i++) {
        // Skip the one we just tried if it was the first one, or just try them all in order
        // To be safe and simple, we'll just cycle through everything.
        currentServerIndex = (currentServerIndex + 1) % SERVERS.length;
        console.log(`Attempting connection to: ${SERVERS[currentServerIndex]}`);

        // Re-initialize client with the next server and the 10s timeout
        client = new xrpl.Client(SERVERS[currentServerIndex], { connectionTimeout: 10000 });

        try {
            await client.connect();
            console.log(`Connected successfully to ${SERVERS[currentServerIndex]}`);
            return;
        } catch (err) {
            console.error(`Failed to connect to ${SERVERS[currentServerIndex]}:`, err);
        }
    }

    throw new Error("All XRPL connection attempts failed. The network may be inaccessible.");
};

const convertHexCurrencyToString = (hex: string): string => {
    if (hex.length === 3) {
        return hex; // It's already a standard currency code like 'USD'
    }
    // Check if it's a valid hex string for a non-standard currency
    if (hex.length > 3 && /^[A-F0-9]+$/.test(hex)) {
        let str = '';
        // Extract the currency code part from the hex string
        const currencyHex = hex.substring(0, Math.min(hex.length, 40));
        for (let i = 0; i < currencyHex.length; i += 2) {
            const charCode = parseInt(currencyHex.substr(i, 2), 16);
            if (charCode === 0) break; // Stop at null terminator
            str += String.fromCharCode(charCode);
        }
        return str.trim();
    }
    return hex; // Fallback
};

export const getAccountInfo = async (address: string): Promise<AccountInfo> => {
    await connectClient();
    const [infoResponse, linesResponse] = await Promise.all([
        client.request({ command: 'account_info', account: address, ledger_index: 'validated' }),
        client.request({ command: 'account_lines', account: address, ledger_index: 'validated' })
    ]);

    const balances: Balance[] = [{
        currency: 'XRP',
        value: (Number(infoResponse.result.account_data.Balance) / DROPS_PER_XRP).toString(),
    }];

    for (const line of linesResponse.result.lines) {
        // Only add lines with a non-zero balance
        if (parseFloat(line.balance) !== 0) {
            balances.push({
                currency: convertHexCurrencyToString(line.currency),
                value: line.balance,
                issuer: line.account,
            });
        }
    }

    return {
        address: infoResponse.result.account_data.Account,
        balances,
    };
};

const formatAmount = (amount: any): { value: string, currency: string } => {
    if (typeof amount === 'string') {
        return { value: (Number(amount) / DROPS_PER_XRP).toString(), currency: 'XRP' };
    }
    if (typeof amount === 'object' && amount.currency) {
        return { value: amount.value, currency: convertHexCurrencyToString(amount.currency) };
    }
    return { value: 'N/A', currency: 'N/A' };
};


const getBalanceChanges = (meta: any, address: string): BalanceChange[] => {
    const changes: BalanceChange[] = [];
    if (!meta || !meta.AffectedNodes) {
        return changes;
    }

    for (const affectedNode of meta.AffectedNodes) {
        const node = affectedNode.ModifiedNode || affectedNode.CreatedNode;

        if (!node || !node.LedgerEntryType) continue;

        const finalFields = node.FinalFields || node.NewFields;
        const prevFields = node.PreviousFields;

        if (node.LedgerEntryType === 'AccountRoot' && finalFields?.Account === address) {
            const oldBalance = BigInt(prevFields?.Balance || finalFields.Balance);
            const newBalance = BigInt(finalFields.Balance);
            const change = newBalance - oldBalance;

            if (change !== 0n) {
                changes.push({
                    currency: 'XRP',
                    value: (Number(change) / DROPS_PER_XRP).toString(),
                });
            }
        } else if (node.LedgerEntryType === 'RippleState' && finalFields) {
            const isLowParty = finalFields.LowLimit.issuer === address;
            const isHighParty = finalFields.HighLimit.issuer === address;

            if (isLowParty || isHighParty) {
                const currency = convertHexCurrencyToString(finalFields.Balance.currency);
                const issuer = isLowParty ? finalFields.HighLimit.issuer : finalFields.LowLimit.issuer;

                const oldBalanceVal = parseFloat(prevFields?.Balance?.value || '0');
                const newBalanceVal = parseFloat(finalFields.Balance.value);
                let change = newBalanceVal - oldBalanceVal;

                if (isHighParty) {
                    change = -change;
                }

                if (change !== 0) {
                    changes.push({
                        currency,
                        value: change.toString(),
                        issuer,
                    });
                }
            }
        }
    }
    return changes;
}

const getAllDetailedBalanceChanges = (meta: any): DetailedBalanceChange[] => {
    const changes: DetailedBalanceChange[] = [];
    if (!meta || !meta.AffectedNodes) {
        return changes;
    }

    for (const affectedNode of meta.AffectedNodes) {
        const node = affectedNode.ModifiedNode || affectedNode.CreatedNode || affectedNode.DeletedNode;
        if (!node || !node.LedgerEntryType) continue;

        const finalFields = node.FinalFields || node.NewFields;
        const prevFields = node.PreviousFields;

        if (node.LedgerEntryType === 'AccountRoot') {
            const account = finalFields?.Account || prevFields?.Account;
            if (!account) continue;

            let oldBalance = 0n;
            let newBalance = 0n;

            if (affectedNode.ModifiedNode) {
                oldBalance = BigInt(prevFields?.Balance || finalFields.Balance);
                newBalance = BigInt(finalFields.Balance);
            } else if (affectedNode.CreatedNode) {
                oldBalance = 0n;
                newBalance = BigInt(finalFields.Balance);
            } else if (affectedNode.DeletedNode) {
                oldBalance = BigInt(finalFields.Balance);
                newBalance = 0n;
            }

            const change = newBalance - oldBalance;
            if (change !== 0n) {
                changes.push({
                    account,
                    currency: 'XRP',
                    value: (Number(change) / DROPS_PER_XRP).toString(),
                });
            }
        } else if (node.LedgerEntryType === 'RippleState' && finalFields) {
            const currency = convertHexCurrencyToString(finalFields.Balance.currency);
            let oldBalanceVal = 0;
            let newBalanceVal = 0;

            if (affectedNode.ModifiedNode) {
                oldBalanceVal = parseFloat(prevFields?.Balance?.value || finalFields.Balance.value);
                newBalanceVal = parseFloat(finalFields.Balance.value);
            } else if (affectedNode.CreatedNode) {
                oldBalanceVal = 0;
                newBalanceVal = parseFloat(finalFields.Balance.value);
            } else if (affectedNode.DeletedNode) {
                oldBalanceVal = parseFloat(finalFields.Balance.value);
                newBalanceVal = 0;
            }

            const changeVal = newBalanceVal - oldBalanceVal;
            if (changeVal !== 0) {
                // Low party's balance change is the changeVal
                changes.push({
                    account: finalFields.LowLimit.issuer,
                    currency,
                    value: changeVal.toString(),
                    issuer: finalFields.HighLimit.issuer,
                });
                // High party's balance change is the inverse of changeVal
                changes.push({
                    account: finalFields.HighLimit.issuer,
                    currency,
                    value: (-changeVal).toString(),
                    issuer: finalFields.LowLimit.issuer,
                });
            }
        }
    }
    return changes;
}

/**
 * Processes a raw transaction item into a ProcessedTransaction object.
 * This is a shared helper function for both account and single transaction lookups.
 */
const processTxItem = (item: any, perspectiveAddress: string): ProcessedTransaction | null => {
    const tx = item.tx || item; // `account_tx` has `item.tx`, `tx` command has `item`
    const meta = item.meta || item.metaData;

    if (!tx || !meta) return null;

    const fee = tx.Fee ? (Number(tx.Fee) / DROPS_PER_XRP).toString() : '0';

    const balanceChanges = getBalanceChanges(meta, perspectiveAddress);
    const allBalanceChanges = getAllDetailedBalanceChanges(meta);

    // Ensure there's a balance change or a fee to justify showing the transaction
    if (balanceChanges.length === 0) {
        const feeValue = tx.Fee ? -(Number(tx.Fee) / DROPS_PER_XRP) : 0;
        if (feeValue !== 0) {
            balanceChanges.push({ currency: 'XRP', value: feeValue.toString() });
        } else {
            // No balance change and no fee, so we skip it.
            return null;
        }
    }

    // Filter out the fee from the balance changes if the perspective address is the sender.
    // This prevents the fee from showing up in the Debit/Credit columns, as it has its own column.
    if (tx.Account === perspectiveAddress && tx.Fee) {
        const feeVal = Number(tx.Fee) / DROPS_PER_XRP;
        const xrpChangeIndex = balanceChanges.findIndex(c => c.currency === 'XRP');

        if (xrpChangeIndex !== -1) {
            const currentVal = parseFloat(balanceChanges[xrpChangeIndex].value);
            // Add the fee back (since it was a debit/negative value) to get the actual transfer amount
            const adjustedVal = currentVal + feeVal;

            // If the value is effectively zero (only fee was paid), remove the entry
            if (Math.abs(adjustedVal) < 1e-9) {
                balanceChanges.splice(xrpChangeIndex, 1);
            } else {
                // Otherwise update with the non-fee amount
                balanceChanges[xrpChangeIndex].value = adjustedVal.toString();
            }
        }
    }

    let details = `Type: ${tx.TransactionType}`; // Fallback details
    let detailsKey = 'details_fallback';
    let detailsParams: Record<string, string | number> = { type: tx.TransactionType };

    if (tx.TransactionType === 'Payment') {
        const counterparty = tx.Account === perspectiveAddress ? tx.Destination : tx.Account;
        // Synchronously check cache
        const label = knownAddressesCache[counterparty];
        if (label) {
            detailsKey = tx.Account === perspectiveAddress ? 'details_payment_to_known' : 'details_payment_from_known';
            detailsParams = { label, address: counterparty };
        } else {
            detailsKey = tx.Account === perspectiveAddress ? 'details_payment_to' : 'details_payment_from';
            detailsParams = { address: counterparty };
        }
    } else if (tx.TransactionType === 'OfferCreate') {
        const actualDebits = balanceChanges.filter(c => parseFloat(c.value) < 0);
        const actualCredits = balanceChanges.filter(c => parseFloat(c.value) > 0);

        if (actualDebits.length > 0 && actualCredits.length > 0) {
            const paid = actualDebits.find(d => d.currency !== 'XRP') || actualDebits[0];
            const got = actualCredits[0];

            detailsKey = 'details_dex_order';
            detailsParams = {
                paidAmount: Math.abs(parseFloat(paid.value)),
                paidCurrency: paid.currency,
                gotAmount: parseFloat(got.value),
                gotCurrency: got.currency,
            };
        } else {
            const tfSell = 0x00020000;
            const isSellOffer = tx.Flags && (tx.Flags & tfSell) === tfSell;
            const pays = formatAmount(isSellOffer ? tx.TakerPays : tx.TakerGets);
            const gets = formatAmount(isSellOffer ? tx.TakerGets : tx.TakerPays);
            detailsKey = 'details_dex_unfilled';
            detailsParams = {
                paidAmount: pays.value,
                paidCurrency: pays.currency,
                gotAmount: gets.value,
                gotCurrency: gets.currency,
            };
        }
    } else if (tx.TransactionType === 'OfferCancel') {
        detailsKey = 'details_offer_cancel';
        detailsParams = {};
    } else if (tx.TransactionType === 'TrustSet') {
        const limit = formatAmount(tx.LimitAmount);
        const issuer = tx.LimitAmount.issuer;
        // Synchronously check cache
        const label = knownAddressesCache[issuer];

        if (label) {
            detailsKey = 'details_trust_set_known';
            detailsParams = { amount: limit.value, currency: limit.currency, label, address: issuer };
        } else {
            detailsKey = 'details_trust_set';
            detailsParams = { amount: limit.value, currency: limit.currency, address: issuer };
        }
    } else if (tx.TransactionType === 'AccountSet') {
        detailsKey = 'details_account_set';
        detailsParams = {};
    }

    const date = tx.date ? new Date((tx.date + 946684800) * 1000).toISOString() : 'N/A';

    return {
        id: tx.hash,
        date,
        type: tx.TransactionType,
        details, // keep for backward compatibility if needed
        detailsKey,
        detailsParams,
        fee,
        balanceChanges,
        allBalanceChanges,
        result: meta.TransactionResult,
        rawData: JSON.stringify(item, null, 2),
    };
};


export const getAccountTransactions = async (
    address: string,
    marker?: object
): Promise<{ transactions: ProcessedTransaction[]; marker?: object }> => {
    await connectClient();

    const request: any = {
        command: 'account_tx',
        account: address,
        limit: 100,
    };
    if (marker) {
        request.marker = marker;
    }

    const response = await client.request(request);

    // processTxItem is now synchronous, so we can just map and filter.
    const transactions: ProcessedTransaction[] = response.result.transactions
        .map((item: any) => processTxItem(item, address))
        .filter((tx): tx is ProcessedTransaction => tx !== null);

    transactions.forEach(tx => {
        if (tx.type === 'OfferCreate' && tx.balanceChanges.length === 2) {
            const xrpChange = tx.balanceChanges.find(c => c.currency === 'XRP');
            const usdLikeChange = tx.balanceChanges.find(c => USD_LIKE_CURRENCIES.includes(c.currency));
            if (xrpChange && usdLikeChange) {
                const xrpAmount = Math.abs(parseFloat(xrpChange.value));
                const usdAmount = Math.abs(parseFloat(usdLikeChange.value));
                if (xrpAmount > 0) {
                    tx.xrpValueUSD = usdAmount;
                    tx.xrpPriceAtTx = usdAmount / xrpAmount;
                }
            }
        }
    });

    return {
        transactions,
        marker: response.result.marker,
    };
};

export const getTransactionDetails = async (hash: string): Promise<ProcessedTransaction> => {
    await connectClient();

    const response = await client.request({ command: 'tx', transaction: hash, binary: false });
    const item = response.result;

    const initiatorAddress = item.Account;
    const processedTx = processTxItem(item, initiatorAddress);

    if (!processedTx) {
        throw new Error('Failed to process transaction data.');
    }

    if (processedTx.type === 'OfferCreate' && processedTx.balanceChanges.length === 2) {
        const xrpChange = processedTx.balanceChanges.find(c => c.currency === 'XRP');
        const usdLikeChange = processedTx.balanceChanges.find(c => USD_LIKE_CURRENCIES.includes(c.currency));
        if (xrpChange && usdLikeChange) {
            const xrpAmount = Math.abs(parseFloat(xrpChange.value));
            const usdAmount = Math.abs(parseFloat(usdLikeChange.value));
            if (xrpAmount > 0) {
                processedTx.xrpValueUSD = usdAmount;
                processedTx.xrpPriceAtTx = usdAmount / xrpAmount;
            }
        }
    }

    return processedTx;
};

export const getTraceStep = async (txId: string, prices: Prices | null): Promise<TracePathItem> => {
    await connectClient();

    const txResponse = await client.request({ command: 'tx', transaction: txId });
    const tx = txResponse.result;

    if (tx.TransactionType !== 'Payment') {
        throw new Error('Tracing is only supported for Payment transactions.');
    }

    const sender = tx.Account;
    const formattedAmount = formatAmount(tx.Amount);

    let senderBalance: string | undefined = undefined;
    let senderBalanceUSD: number | undefined = undefined;
    const xrpPrice = prices?.['XRP'] || 0;

    try {
        const senderInfo = await client.request({
            command: 'account_info',
            account: sender,
            ledger_index: 'validated',
        });
        senderBalance = (Number(senderInfo.result.account_data.Balance) / DROPS_PER_XRP).toString();
        if (xrpPrice > 0) {
            senderBalanceUSD = parseFloat(senderBalance) * xrpPrice;
        }
    } catch (e) {
        console.warn(`Could not fetch balance for traced account ${sender}:`, e);
    }

    const senderTxHistory = await client.request({
        command: 'account_tx',
        account: sender,
        ledger_index_max: tx.ledger_index - 1, // Look at transactions before this one
        limit: 50, // Check the last 50 transactions for a funding source
    });

    const fundingTx = senderTxHistory.result.transactions.find(
        (historyTx: any) =>
            historyTx.validated &&
            historyTx.tx?.TransactionType === 'Payment' &&
            historyTx.tx?.Destination === sender &&
            historyTx.tx?.Account !== sender // Exclude self-payments to avoid loops
    );

    return {
        address: sender,
        amount: formattedAmount.value,
        currency: formattedAmount.currency,
        txId: tx.hash,
        balance: senderBalance,
        balanceUSD: senderBalanceUSD,
        nextFundingTxId: fundingTx?.tx?.hash,
    };
};
