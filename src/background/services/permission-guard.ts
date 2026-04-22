export type PermissionGuard = {
  canProcessBackgroundMessages(): boolean;
};

export function createPermissionGuard(): PermissionGuard {
  return {
    canProcessBackgroundMessages() {
      return true;
    }
  };
}
