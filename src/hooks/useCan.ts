import { useAuth } from "../contexts/AuthContext"
import { validateUserPermission } from "../utils/validateUserPermissions";

type UseCanParams = {
  permissions?: string[];
  roles?: string[];
}

export function useCan({ permissions = [], roles = [] }: UseCanParams) {
  const { isAuthenticated, user } = useAuth();

  if(!isAuthenticated || !user) {
    return false;
  }
  const userHasValidPermissions = validateUserPermission({ user, permissions, roles });

  return userHasValidPermissions;
}