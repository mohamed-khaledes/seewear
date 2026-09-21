/**
 * Server-only surface of the content feature. `ContactPage` reads the session
 * to prefill the form, so it must not reach a client bundle through the plain
 * barrel.
 */
export { ContactPage } from "./pages/contact-page";
// These two read the live pricing rules from the database.
export { ShippingPage } from "./pages/shipping-page";
export { ReturnsPage } from "./pages/returns-page";
export { CookiesPage, PrivacyPage, TermsPage } from "./pages/legal-pages";
