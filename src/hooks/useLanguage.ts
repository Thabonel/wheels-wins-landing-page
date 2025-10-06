import { useTranslation } from 'react-i18next';
import { useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useLanguage = () => {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  // Sync language with user settings
  useEffect(() => {
    const loadUserLanguage = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('display_preferences')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error loading user language:', error);
          return;
        }

        if (data?.display_preferences?.language) {
          const userLang = data.display_preferences.language;
          if (i18n.language !== userLang) {
            await i18n.changeLanguage(userLang);
          }
        }
      } catch (error) {
        console.error('Failed to load user language:', error);
      }
    };

    loadUserLanguage();
  }, [user, i18n]);

  const changeLanguage = useCallback(
    async (language: string) => {
      try {
        // Change i18n language
        await i18n.changeLanguage(language);

        // Save to user settings if logged in
        if (user) {
          const { error } = await supabase
            .from('user_settings')
            .update({
              display_preferences: {
                language,
              },
            })
            .eq('user_id', user.id);

          if (error) {
            console.error('Error saving language preference:', error);
          }
        }
      } catch (error) {
        console.error('Failed to change language:', error);
      }
    },
    [i18n, user]
  );

  return {
    language: i18n.language,
    changeLanguage,
    languages: {
      en: 'English',
      es: 'Español',
      fr: 'Français',
    },
  };
};
