import { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const LensContext = createContext(null);

export function LensProvider({ children }) {
  const [pixxiUsers, setPixxiUsers] = useState([]);
  const [lensUser, setLensUser] = useState(null); // null = viewing as self

  useEffect(() => {
    base44.functions.invoke('getPixxiUsers', {})
      .then(res => {
        const users = res.data?.users || [];
        setPixxiUsers(users);
        // Default lens to Junaid (most leads = 232) for richest test data
        const defaultUser = users.find(u =>
          u.pixxi_user_email === 'junaid@realcocapital.ae' ||
          u.name?.toLowerCase().includes('junaid')
        );
        if (defaultUser) setLensUser(defaultUser);
      })
      .catch(err => {
        console.warn('Lens: getPixxiUsers error', err);
      });
  }, []);

  // The email to use for all data queries
  const lensEmail = lensUser?.pixxi_user_email || lensUser?.primary_email || null;

  return (
    <LensContext.Provider value={{ pixxiUsers, lensUser, setLensUser, lensEmail }}>
      {children}
    </LensContext.Provider>
  );
}

export function useLens() {
  return useContext(LensContext);
}