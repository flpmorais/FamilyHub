import { useContext, useEffect, useState } from "react";
import { useAuthStore } from "../stores/auth.store";
import { RepositoryContext } from "../repositories/repository.context";
import type { Profile } from "../types/profile.types";

export function useCurrentProfile() {
  const { userAccount } = useAuthStore();
  const repositories = useContext(RepositoryContext);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!userAccount?.familyId || !userAccount.profileId || !repositories)
      return;

    repositories.profile
      .getProfilesByFamily(userAccount.familyId)
      .then((profiles) => {
        const match = profiles.find((p) => p.id === userAccount.profileId);
        if (match) setProfile(match);
      })
      .catch(() => {});
  }, [userAccount?.familyId, userAccount?.profileId, repositories]);

  return profile;
}
