import React from 'react';

interface AccountInputProps {
  address: string;
  setAddress: (address: string) => void;
  onFetch: () => void;
  loading: boolean;
  t: (key: string) => string;
}

export const AccountInput: React.FC<AccountInputProps> = ({ address, setAddress, onFetch, loading, t }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFetch();
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="xrp-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('addressInputLabel')}
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          id="xrp-address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t('addressInputPlaceholder')}
          className="flex-grow w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-xrp-blue focus:border-xrp-blue transition-all duration-200"
          disabled={loading}
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-gray-100 bg-[#0055ff] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-xrp-blue disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
          disabled={loading}
        >
          {loading ? t('searching') : t('search')}
        </button>
      </div>
    </form>
  );
};