
import { useApp } from '../context/AppContext';
import { GUEST_LIMITATIONS } from '../types/guest';

export const useGuestMode = () => {
  const {
    isGuest,
    guestProfile,
    guestWarning,
    guestTrialHistory,
    showRegisterModal,
    recordTrialPlay,
    rateGameAsGuest,
    updateGuestPreferences,
  } = useApp();

  const canAddFriends = !isGuest;
  const canEarnAchievements = !isGuest;
  const canUseCloudSave = !isGuest;
  const canAccessFullHistory = !isGuest;

  const remainingTrialSlots = guestTrialHistory
    ? GUEST_LIMITATIONS.maxTrialHistory - guestTrialHistory.length
    : GUEST_LIMITATIONS.maxTrialHistory;

  const isNearTrialLimit = remainingTrialSlots <= 2;

  const checkFeatureAccess = (feature: keyof typeof GUEST_LIMITATIONS): boolean => {
    if (!isGuest) return true;

    const limitation = GUEST_LIMITATIONS[feature];
    return limitation !== false && limitation !== 0;
  };

  const promptForRegistration = (_reason: string) => {
    // Guest limitation triggered: ${reason}
    showRegisterModal();
  };

  return {
    isGuest,
    guestProfile,
    guestWarning,
    limitations: GUEST_LIMITATIONS,

    // Feature access
    canAddFriends,
    canEarnAchievements,
    canUseCloudSave,
    canAccessFullHistory,

    // Trial limits
    remainingTrialSlots,
    isNearTrialLimit,

    // Actions
    recordTrialPlay,
    rateGameAsGuest,
    updateGuestPreferences,
    checkFeatureAccess,
    promptForRegistration,
  };
};
