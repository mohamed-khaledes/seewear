/** Server-only surface of the auth feature. */
export { AccountPage } from "./pages/account-page";
// Reads the session, so it must never ride along in the client-safe barrel.
export { ResetPasswordPage } from "./pages/reset-password-page";
export { getMyAddresses } from "./services/api/addresses.server";
export {
  getSessionUser,
  requireAdmin,
  requireUser,
} from "./services/api/session.server";
