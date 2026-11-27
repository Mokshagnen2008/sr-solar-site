# SR Consistency backend setup

The backend is an Azure Functions v4 Node.js app. The contact function saves website inquiries to the existing Supabase project. The assistant function returns short, curated answers for SR Solar, Real Estate, and SR Global Consultants. It does not store chat messages or call a paid AI service. The Supabase service-role key is read only by the contact function and must never be added to website JavaScript or committed to source control.

The admin page supports authorized email verification, project photo upload/removal, and an admin-only visit total. The email verification link starts the admin session on whichever device opens it. A Supabase Edge Function limits verification-link requests to 10 per UTC day across devices. The browser never stores a Supabase service-role key. Public pages record page visits; only the admin page can read the total, and public visitors cannot read individual visit records.

## One-time Supabase setup

Run the updated `supabase-setup.sql` in the Supabase SQL Editor. It creates `contact_inquiries` with row-level security enabled and no public table access, and the private daily sign-in counter. The function writes through the server-only service-role key.

The same SQL configures the public photo bucket, admin-only photo management, visit tracking, a read-only aggregate visit-count function, and the daily admin sign-in cap. The `supabase/functions/admin-signin` Edge Function is deployed to the SR Supabase project. In Supabase Authentication URL settings, allow the deployed site's `/admin.html` URL as an email sign-in redirect and enable email sign-in. Only the authorized address can request a link and open admin tools. The admin opens the one-time link on whichever device should hold the admin session; access is checked against the verified email account, and no device is enrolled or approved. Existing authenticated sessions remain active until signed out or expired; the 10-per-day cap limits new verification-link requests. Keep the email in `supabase-config.js`, the Edge Function, and `supabase-setup.sql` aligned.

## Website assistant

The chat widget works on GitHub Pages using its built-in answers. To use the Azure endpoint too, add a `meta` tag to the public pages with the full HTTPS URL of the deployed function, for example `<meta name="sr-assistant-api" content="https://YOUR_FUNCTION_APP.azurewebsites.net/api/assistant">`. Add the GitHub Pages origin (for example, `https://mokshagnen2008.github.io`) to the Function App's CORS allowlist and set the same origin in the `ASSISTANT_ALLOWED_ORIGINS` application setting. The widget falls back to its built-in answers if the backend is unavailable.

The repository's `Backend checks` workflow runs automatically when backend or assistant files change. It checks the Azure Functions JavaScript syntax. Deploying the backend itself still requires an Azure Function App and its deployment credentials.

## Local backend

1. Install Node.js 20 or newer, Azure Functions Core Tools v4, and (for local storage emulation) Azurite.
2. In `api`, run `npm install`.
3. Copy `local.settings.example.json` to `local.settings.json`, then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to values from the Supabase project. Keep `local.settings.json` private and do not commit it.
4. Run `npm start` from `api`. The endpoints are `http://localhost:7071/api/contact` and `http://localhost:7071/api/assistant`.

## Deployment

Deploy the contents of `api` as an Azure Functions app running Node.js 20. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as application settings in Azure. Publish the static website to a host that routes `/api/*` to this function (Azure Static Web Apps supports this layout when the API app is linked). The current GitHub Pages site is static and cannot run Azure Functions; its contact form will show the phone fallback until the API is deployed and routed at `/api/contact`.

After deployment, submit a test inquiry and confirm it appears in the Supabase `contact_inquiries` table. Delete the test record afterward.
