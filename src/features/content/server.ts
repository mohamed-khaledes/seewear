/**
 * Server-only surface of the content feature. `ContactPage` reads the session
 * to prefill the form, so it must not reach a client bundle through the plain
 * barrel.
 */
export { ContactPage } from "./pages/contact-page";
