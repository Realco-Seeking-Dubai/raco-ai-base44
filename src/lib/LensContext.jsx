import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const LensContext = createContext(null);

export function LensProvider({ children }) {
  const [pixxiUsers, setPixxiUsers] = useState([]);
  const [lensUser, setLensUser] = useState(null); // null = viewing as self

  useEffect(() => {
    supabase
      .from('pixxi_users')
      .select('id, full_name, pixxi_email, primary_email, lifecycle_status, role')
      .order('full_name', { ascending: true })
      .then(({ data }) => {
        const users = data || [];
        setPixxiUsers(users);
        // Default lens to Irfan
        const irfan = users.find(u =>
          u.full_name?.toLowerCase().includes('irfan') ||
          u.pixxi_email?.toLowerCase().includes('irfan') ||
          u.primary_email?.toLowerCase().includes('irfan')
        );
        if (irfan) setLensUser(irfan);
      });
  }, []);

  // The email to use for all data queries
  const lensEmail = lensUser?.pixxi_email || lensUser?.primary_email || null;

  return (
    <LensContext.Provider value={{ pixxiUsers, lensUser, setLensUser, lensEmail }}>
      {children}
    </LensContext.Provider>
  );
}

export function useLens() {
  return useContext(LensContext);
}