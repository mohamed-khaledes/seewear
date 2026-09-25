/**
 * Public surface of the auth feature. Client-safe.
 *
 * The sign-in and sign-up screens are NOT here: they read the request to know
 * which language to render in, which makes them server-only. They live in
 * `@/features/auth/server` with the rest of it.
 */
export { DemoLoginButtons } from "./components/demo-login-buttons";
export { UserMenu } from "./components/user-menu";
export { useSessionUser } from "./components/session-provider";
export { signOutAction } from "./services/api/auth-actions";
export type {
  AddressValues,
  Profile,
  ProfileValues,
  SavedAddress,
  SessionUser,
} from "./types";
export { addressSchema, profileSchema } from "./types";
