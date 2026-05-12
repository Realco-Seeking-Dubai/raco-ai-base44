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
        // Default lens to Irfan if found
        const irfan = users.find(u =>
          u.name?.toLowerCase().includes('irfan') ||
          u.pixxi_user_email?.toLowerCase().includes('irfan') ||
          u.primary_email?.toLowerCase().includes('irfan')
        );
        if (irfan) setLensUser(irfan);
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