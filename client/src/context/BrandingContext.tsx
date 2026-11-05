import React, { createContext, useContext, useState, useEffect } from 'react';
import { PlatformBranding, SubscriptionPlan } from '../types';
import { api } from '../services/api';

interface BrandingContextType {
  branding: PlatformBranding;
  plans: SubscriptionPlan[];
  isLoading: boolean;
  refreshBranding: () => Promise<void>;
}

const defaultBranding: PlatformBranding = {
  appName: 'Universal Billing SaaS',
  companyName: 'Universal Systems Inc.',
  logoUrl: '/brand-logo.svg',
  primaryColor: '#0c87eb',
  supportEmail: 'support@universalbilling.io',
  supportPhone: '+91 80 4000 8800',
  currency: 'INR',
  currencySymbol: '₹',
  allowPublicRegistration: true,
  maintenanceMode: false
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  plans: [],
  isLoading: true,
  refreshBranding: async () => {}
});

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<PlatformBranding>(defaultBranding);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      const res: any = await api.get('/public/config');
      if (res && res.success && res.data) {
        setBranding(res.data.branding);
        setPlans(res.data.plans || []);
        
        // Dynamically update document title
        document.title = `${res.data.branding.appName} - Universal Billing & Business Management`;
      }
    } catch (err) {
      console.warn('[Branding] Using default platform branding:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, plans, isLoading, refreshBranding: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
