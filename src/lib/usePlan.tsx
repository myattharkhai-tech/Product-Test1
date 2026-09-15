import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import type { PlanInfo } from '@/types';
import { fetchPlan, updatePlan, updateWeeklyEmail } from '@/lib/api';

interface PlanContextValue {
  plan: 'free' | 'pro';
  weeklyEmailEnabled: boolean;
  loading: boolean;
  upgrade: () => Promise<void>;
  downgrade: () => Promise<void>;
  toggleWeeklyEmail: (enabled: boolean) => Promise<void>;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [weeklyEmailEnabled, setWeeklyEmailEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info: PlanInfo = await fetchPlan();
        if (!cancelled) {
          setPlan(info.plan);
          setWeeklyEmailEnabled(info.weeklyEmailEnabled);
        }
      } catch {
        // Default to free on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const upgrade = useCallback(async () => {
    await updatePlan('pro');
    setPlan('pro');
  }, []);

  const downgrade = useCallback(async () => {
    await updatePlan('free');
    setPlan('free');
  }, []);

  const toggleWeeklyEmail = useCallback(async (enabled: boolean) => {
    await updateWeeklyEmail(enabled);
    setWeeklyEmailEnabled(enabled);
  }, []);

  return (
    <PlanContext.Provider value={{ plan, weeklyEmailEnabled, loading, upgrade, downgrade, toggleWeeklyEmail }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    return {
      plan: 'free',
      weeklyEmailEnabled: false,
      loading: true,
      upgrade: async () => {},
      downgrade: async () => {},
      toggleWeeklyEmail: async () => {},
    };
  }
  return ctx;
}
