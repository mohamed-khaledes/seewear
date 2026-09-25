/** Server-only surface of the auth feature. */
export { AccountPage } from "./pages/account-page";
// These render the request's language, so they are server-only too.
export { AuthShell } from "./components/auth-shell";
export { LoginPage } from "./pages/login-page";
export { SignupPage } from "./pages/signup-page";
// Reads the session, so it must never ride along in the client-safe barrel.
export { ResetPasswordPage } from "./pages/reset-password-page";
export { ForgotPasswordPage } from "./pages/forgot-password-page";
export { getMyAddresses } from "./services/api/addresses.server";
export {
  getSessionUser,
  requireAdmin,
  requireUser,
} from "./services/api/session.server";
