import React, { createContext, useContext, useState, useEffect } from 'react';
import { PlatformUser, Business, BusinessUser, BusinessBranch } from '../types';
import { api } from '../services/api';

type AuthType = 'PLATFORM' | 'BUSINESS' | 'GUEST';

interface AuthContextType {
  authType: AuthType;
  isAuthenticated: boolean;
  platformUser: PlatformUser | null;
  business: Business | null;
  businessUser: BusinessUser | null;
  branches: BusinessBranch[];
  activeBranch: BusinessBranch | null;
  setActiveBranch: (branch: BusinessBranch) => void;
  loginPlatform: (token: string, user: PlatformUser) => void;
  loginBusiness: (token: string, user: BusinessUser, business: Business, branches?: BusinessBranch[]) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  authType: 'GUEST',
  isAuthenticated: false,
  platformUser: null,
  business: null,
  businessUser: null,
  branches: [],
  activeBranch: null,
  setActiveBranch: () => {},
  loginPlatform: () => {},
  loginBusiness: () => {},
  logout: () => {},
  isLoading: true
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authType, setAuthType] = useState<AuthType>('GUEST');
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessUser, setBusinessUser] = useState<BusinessUser | null>(null);
  const [branches, setBranches] = useState<BusinessBranch[]>([]);
  const [activeBranch, setActiveBranchState] = useState<BusinessBranch | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session from localStorage
  useEffect(() => {
    const initSession = async () => {
      const token = localStorage.getItem('ub_auth_token');
      const savedType = localStorage.getItem('ub_auth_type') as AuthType;

      if (!token || !savedType) {
        setIsLoading(false);
        return;
      }

      try {
        if (savedType === 'PLATFORM') {
          const res: any = await api.get('/auth/platform/me');
          if (res.success && res.user) {
            setAuthType('PLATFORM');
            setPlatformUser(res.user);
          } else {
            logout();
          }
        } else if (savedType === 'BUSINESS') {
          const res: any = await api.get('/auth/business/me');
          if (res.success && res.user && res.business) {
            setAuthType('BUSINESS');
            setBusinessUser(res.user);
            setBusiness(res.business);
            setBranches(res.branches || []);

            const savedBranchId = localStorage.getItem('ub_active_branch_id');
            const foundBranch = res.branches?.find((b: any) => b.id === savedBranchId) || res.branches?.[0];
            if (foundBranch) {
              setActiveBranchState(foundBranch);
              localStorage.setItem('ub_active_branch_id', foundBranch.id);
            }
          } else {
            logout();
          }
        }
      } catch (err) {
        console.warn('[Auth] Session validation failed:', err);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, []);

  const loginPlatform = (token: string, user: PlatformUser) => {
    localStorage.setItem('ub_auth_token', token);
    localStorage.setItem('ub_auth_type', 'PLATFORM');
    setAuthType('PLATFORM');
    setPlatformUser(user);
    setBusiness(null);
    setBusinessUser(null);
  };

  const loginBusiness = (
    token: string,
    user: BusinessUser,
    biz: Business,
    branchList: BusinessBranch[] = []
  ) => {
    localStorage.setItem('ub_auth_token', token);
    localStorage.setItem('ub_auth_type', 'BUSINESS');
    setAuthType('BUSINESS');
    setBusinessUser(user);
    setBusiness(biz);
    setBranches(branchList);

    const initialBranch = branchList.find(b => b.id === user.branchId) || branchList[0];
    if (initialBranch) {
      setActiveBranchState(initialBranch);
      localStorage.setItem('ub_active_branch_id', initialBranch.id);
    }
  };

  const setActiveBranch = (branch: BusinessBranch) => {
    setActiveBranchState(branch);
    localStorage.setItem('ub_active_branch_id', branch.id);
  };

  const logout = () => {
    localStorage.removeItem('ub_auth_token');
    localStorage.removeItem('ub_auth_type');
    localStorage.removeItem('ub_active_branch_id');
    setAuthType('GUEST');
    setPlatformUser(null);
    setBusiness(null);
    setBusinessUser(null);
    setBranches([]);
    setActiveBranchState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        authType,
        isAuthenticated: authType !== 'GUEST',
        platformUser,
        business,
        businessUser,
        branches,
        activeBranch,
        setActiveBranch,
        loginPlatform,
        loginBusiness,
        logout,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
