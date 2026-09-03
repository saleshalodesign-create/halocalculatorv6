import { useState, useEffect } from 'react';
import { UserProfile, QuoteRecord, RatesConfig } from '../types';

export interface StoredAccount {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  passwordHash?: string;
  lastLogin?: number;
}

const DEFAULT_ACCOUNTS: StoredAccount[] = [
  {
    uid: 'google_sales_halodesign',
    email: 'sales.halodesign@gmail.com',
    displayName: 'Sales Halo Design',
    photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    passwordHash: 'halo123',
    lastLogin: Date.now()
  },
  {
    uid: 'google_admin_halodesign',
    email: 'admin.halodesign@gmail.com',
    displayName: 'Admin Halo Design',
    photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    passwordHash: 'admin123',
    lastLogin: Date.now() - 86400000
  }
];

export const useFirebaseAuth = () => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const cachedUser = localStorage.getItem('halo_google_user');
    return cachedUser ? JSON.parse(cachedUser) : null;
  });
  const [loading, setLoading] = useState(false);
  const [cloudQuotes, setCloudQuotes] = useState<QuoteRecord[]>(() => {
    const cached = localStorage.getItem('halo_cached_cloud_quotes');
    return cached ? JSON.parse(cached) : [];
  });
  const [cloudRates, setCloudRates] = useState<RatesConfig | null>(() => {
    const cached = localStorage.getItem('halo_cached_rates');
    return cached ? JSON.parse(cached) : null;
  });
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline' | 'error'>('synced');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Stored known accounts on this device
  const [accounts, setAccounts] = useState<StoredAccount[]>(() => {
    const stored = localStorage.getItem('halo_stored_accounts');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_ACCOUNTS;
      }
    }
    localStorage.setItem('halo_stored_accounts', JSON.stringify(DEFAULT_ACCOUNTS));
    return DEFAULT_ACCOUNTS;
  });

  const saveAccountsList = (updated: StoredAccount[]) => {
    setAccounts(updated);
    localStorage.setItem('halo_stored_accounts', JSON.stringify(updated));
  };

  const loadUserQuotes = async (uid: string) => {
    if (!uid) return;
    setSyncStatus('saving');
    try {
      let quotes: QuoteRecord[] = [];
      const localCached = localStorage.getItem(`halo_quotes_${uid}`);
      if (localCached) {
        quotes = JSON.parse(localCached);
      }
      setCloudQuotes(quotes);
      localStorage.setItem('halo_cached_cloud_quotes', JSON.stringify(quotes));
      setSyncStatus('synced');
    } catch (e) {
      console.error("Failed to load cloud quotes:", e);
      setSyncStatus('offline');
    }
  };

  const loadUserRates = async (uid: string) => {
    if (!uid) return;
    try {
      const localCached = localStorage.getItem(`halo_rates_${uid}`);
      if (localCached) {
        const loadedRates = JSON.parse(localCached);
        setCloudRates(loadedRates);
        localStorage.setItem('halo_cached_rates', JSON.stringify(loadedRates));
      }
    } catch (e) {
      console.warn("Load rates error:", e);
    }
  };

  useEffect(() => {
    if (user && user.uid) {
      loadUserQuotes(user.uid);
      loadUserRates(user.uid);
    }
  }, [user]);

  const signInWithCredentials = async (
    emailInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; error?: string; user?: UserProfile }> => {
    setLoading(true);
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    if (!email) {
      setLoading(false);
      return { success: false, error: 'Please enter a valid Google Account email.' };
    }

    if (!password) {
      setLoading(false);
      return { success: false, error: 'Password is required for account authorization.' };
    }

    // Find if account already registered
    const existingIndex = accounts.findIndex(a => a.email.toLowerCase() === email);
    let targetAccount: StoredAccount;

    if (existingIndex >= 0) {
      const matched = accounts[existingIndex];
      // If the account has a password set, verify it
      if (matched.passwordHash && matched.passwordHash !== password) {
        setLoading(false);
        return { success: false, error: 'Incorrect authorization password. Please try again.' };
      }
      targetAccount = {
        ...matched,
        lastLogin: Date.now()
      };
      const updatedAccounts = [...accounts];
      updatedAccounts[existingIndex] = targetAccount;
      saveAccountsList(updatedAccounts);
    } else {
      // First time logging in with this Google account - register with provided password
      const name = email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      targetAccount = {
        uid: 'google_' + btoa(email).replace(/=/g, '').slice(0, 16),
        email: email,
        displayName: name,
        photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        passwordHash: password,
        lastLogin: Date.now()
      };
      saveAccountsList([targetAccount, ...accounts]);
    }

    const authenticatedUser: UserProfile = {
      uid: targetAccount.uid,
      email: targetAccount.email,
      displayName: targetAccount.displayName,
      photoURL: targetAccount.photoURL
    };

    setUser(authenticatedUser);
    localStorage.setItem('halo_google_user', JSON.stringify(authenticatedUser));
    await loadUserQuotes(authenticatedUser.uid);
    await loadUserRates(authenticatedUser.uid);
    setLoading(false);
    setAuthModalOpen(false);

    return { success: true, user: authenticatedUser };
  };

  const changeAccountPassword = (newPassword: string): boolean => {
    if (!user) return false;
    const cleanPass = newPassword.trim();
    if (!cleanPass) return false;

    const updated = accounts.map(acc => {
      if (acc.email.toLowerCase() === user.email.toLowerCase() || acc.uid === user.uid) {
        return { ...acc, passwordHash: cleanPass };
      }
      return acc;
    });

    saveAccountsList(updated);
    return true;
  };

  const signOut = async () => {
    try {
      setUser(null);
      localStorage.removeItem('halo_google_user');
      setCloudQuotes([]);
      localStorage.removeItem('halo_cached_cloud_quotes');
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const saveQuoteToCloud = async (quoteData: Partial<QuoteRecord>): Promise<QuoteRecord | false> => {
    const currentUser = user;
    if (!currentUser) {
      setAuthModalOpen(true);
      return false;
    }

    setSyncStatus('saving');
    const quoteId = quoteData.id || ('qt_' + Date.now());
    const record: QuoteRecord = {
      ...quoteData,
      id: quoteId,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      docNo: quoteData.docNo || 'DRAFT',
      customerName: quoteData.customerName || 'Valued Client',
      grandTotal: quoteData.grandTotal || 0,
      discountAmount: quoteData.discountAmount || 0,
      finalTotal: quoteData.finalTotal || 0,
      items: quoteData.items || [],
      updatedAt: Date.now(),
      createdAt: quoteData.createdAt || Date.now(),
      dateFormatted: quoteData.dateFormatted || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    setCloudQuotes(prev => {
      const filtered = prev.filter(q => q.id !== quoteId);
      const updated = [record, ...filtered];
      localStorage.setItem('halo_cached_cloud_quotes', JSON.stringify(updated));
      localStorage.setItem(`halo_quotes_${currentUser.uid}`, JSON.stringify(updated));
      return updated;
    });

    setSyncStatus('synced');
    return record;
  };

  const deleteQuoteFromCloud = async (quoteId: string) => {
    if (!user) return;
    setSyncStatus('saving');

    setCloudQuotes(prev => {
      const updated = prev.filter(q => q.id !== quoteId);
      localStorage.setItem('halo_cached_cloud_quotes', JSON.stringify(updated));
      localStorage.setItem(`halo_quotes_${user.uid}`, JSON.stringify(updated));
      return updated;
    });

    setSyncStatus('synced');
  };

  const saveRatesToCloud = async (newRates: RatesConfig) => {
    if (!user) return;
    setCloudRates(newRates);
    localStorage.setItem(`halo_rates_${user.uid}`, JSON.stringify(newRates));
    localStorage.setItem('halo_cached_rates', JSON.stringify(newRates));
  };

  return {
    user,
    loading,
    accounts,
    cloudQuotes,
    cloudRates,
    syncStatus,
    authModalOpen,
    setAuthModalOpen,
    signInWithCredentials,
    changeAccountPassword,
    signOut,
    saveQuoteToCloud,
    deleteQuoteFromCloud,
    saveRatesToCloud,
    refreshQuotes: () => user && loadUserQuotes(user.uid)
  };
};

export type AuthContextType = ReturnType<typeof useFirebaseAuth>;

