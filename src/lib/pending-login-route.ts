/**
 * One-shot navigation intent set by a login/OTP screen right before setAuth(), consumed once by
 * AuthGuard so it can route somewhere other than the plain role-default home (e.g. vendor KYC)
 * without a flash of the default screen first.
 */
let pendingRoute: string | null = null;

export const setPendingLoginRoute = (destination: string) => {
  pendingRoute = destination;
};

export const consumePendingLoginRoute = (): string | null => {
  const route = pendingRoute;
  pendingRoute = null;
  return route;
};
