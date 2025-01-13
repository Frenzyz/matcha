import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../config/supabase';

interface FeatureState {
  groupStudyEnabled: boolean;
  toggleGroupStudy: () => void;
  betaFeatures: {
    [key: string]: boolean;
  };
  setBetaFeature: (feature: string, enabled: boolean) => void;
}

export const useFeatureStore = create<FeatureState>()(
  persist(
    (set, get) => ({
      groupStudyEnabled: false,
      betaFeatures: {
        groupStudy: false,
      },
      toggleGroupStudy: async () => {
        const newValue = !get().groupStudyEnabled;
        set({ groupStudyEnabled: newValue });
        
        // Update user preferences in Supabase if authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ 
              beta_features: { ...get().betaFeatures, groupStudy: newValue },
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        }
      },
      setBetaFeature: async (feature: string, enabled: boolean) => {
        const newBetaFeatures = {
          ...get().betaFeatures,
          [feature]: enabled
        };
        
        set({ betaFeatures: newBetaFeatures });
        
        // Update user preferences in Supabase if authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ 
              beta_features: newBetaFeatures,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        }
      }
    }),
    {
      name: 'feature-storage',
      version: 1
    }
  )
);
