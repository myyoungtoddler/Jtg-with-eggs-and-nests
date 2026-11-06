export const isPanelAdmin = (user: any) => user?.role === "admin" || user?.role === "owner";

export const getServerSubUser = (server: any, userId: string) =>
  (server?.subUsers || []).find((subUser: any) => subUser.userId === userId);

export const canAccessServer = (server: any, user: any) =>
  isPanelAdmin(user) || server?.owner === user?.id || Boolean(getServerSubUser(server, user?.id));

export const hasServerPermission = (server: any, user: any, permission: string) => {
  if (isPanelAdmin(user) || server?.owner === user?.id) return true;
  return Boolean(getServerSubUser(server, user?.id)?.permissions?.includes(permission));
};