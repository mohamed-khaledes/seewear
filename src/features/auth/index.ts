/**
 * Public surface of the auth feature. Client-safe.
 * Server-only helpers (session lookup) live in `@/features/auth/server`.
 */
export { AuthShell } from "./components/auth-shell";
export { DemoLoginButtons } from "./components/demo-login-buttons";
export { UserMenu } from "./components/user-menu";
export { useSessionUser } from "./components/session-provider";
export { LoginPage } from "./pages/login-page";
export { SignupPage } from "./pages/signup-page";
export { ForgotPasswordPage } from "./pages/forgot-password-page";
export { signOutAction } from "./services/api/auth-actions";
export type {
  AddressValues,
  Profile,
  ProfileValues,
  SavedAddress,
  SessionUser,
} from "./types";
export { addressSchema, profileSchema } from "./types";
