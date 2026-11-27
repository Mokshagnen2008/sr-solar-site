# SR Consistency backend setup

The backend is an Azure Functions v4 Node.js app. The contact function saves website inquiries to the existing Supabase project. The assistant function returns short, curated answers for SR Solar, Real Estate, and SR Global Consultants. It does not store chat messages or call a paid AI service. The Supabase service-role key is read only by the contact function and must never be added to website JavaScript or committed to source control.

The admin page supports authorized email verification, project photo upload/removal, and an admin-only visit total. The email verification link starts the admin session on whichever device opens it. A Supabase Edge Function limits verification-link requests to 10 per UTC day across devices. The browser never stores a Supabase service-role key. Public pages record page visits; only the admin page can read the total, and public visitors cannot read individual visit records.

## One-time Supabase setup

Run the updated `supabase-setup.sql` in the Supabase SQL Editor. It creates `contact_inquiries` with row-level security enabled and no public table access, and the private daily sign-in counter. The function writes through the server-only service-role key.

The same SQL configures the public photo bucket, admin-only photo management, visit tracking, a read-only aggregate visit-count function, and the daily admin sign-in cap. The `supabase/functions/admin-signin` Edge Function is deployed to the SR Supabase project. In Supabase Authentication URL settings, allow the deployed site's `/admin.html` URL as an email sign-in redirect and enable email sign-in. Only the authorized address can request a link and open admin tools. The admin opens the one-time link on whichever device should hold the admin session; access is checked against the verified email account, and no device is enrolled or approved. Existing authenticated sessions remain active until signed out or expired; the 10-per-day cap limits new verification-link requests. Keep the email in `supabase-config.js`, the Edge Function, and `supabase-setup.sql` aligned.

## Website assistant

The website chat is a guided FAQ assistant for SR Solar, SR Real Estate, and SR Global Consultants. It runs on GitHub Pages without another app or service, does not save chat messages, and does not send them to an AI provider. Answers are shared by the browser and optional API so the two versions stay consistent.

Bot settings and files:

- `assistant-knowledge.js` is the public bot settings and knowledge file. It contains the approved answers, topic buttons, contact email and phone, page links, and privacy note. Edit this file to maintain the bot's answers and routing.
- `site-assistant.js` builds the chat panel, handles messages, accessibility, safe contact links, and its optional API connection.
- `1.css` styles the chat on desktop and mobile.
- `index.html`, `solar.html`, `real-estate.html`, and `global-consultants.html` load the shared knowledge and chat files.
- `api/src/functions/assistant.js` serves the same curated answers if an Azure Functions API is connected. It validates message type and length and limits browser access with an origin allowlist.

No Gmail, Telegram, or Supabase access is needed for the current website FAQ bot. GitHub is needed to publish website changes. Azure is optional: to connect its API, deploy `api` to an Azure Function App and add a `meta` tag to the public pages with that function's HTTPS URL, for example `<meta name="sr-assistant-api" content="https://YOUR_FUNCTION_APP.azurewebsites.net/api/assistant">`. Add the GitHub Pages origin (for example, `https://mokshagnen2008.github.io`) to the Function App CORS allowlist and the `ASSISTANT_ALLOWED_ORIGINS` application setting. The website continues using its local answers if the API is unavailable.

The current assistant provides curated guidance only. It does not confirm current job vacancies or property listings, quote solar prices, accept applications, or guarantee employment, licensing, or visa outcomes. Visitors should not enter passwords, payment information, or medical documents in chat. If adding AI-generated answers, saved conversations, or lead delivery later, use a server-side provider integration and explicitly configure its data handling and secrets in the hosting provider; never put private keys in these public files.

The repository's `Backend checks` workflow runs automatically when backend or assistant files change. It checks the Azure Functions JavaScript syntax. Deploying the backend itself still requires an Azure Function App and its deployment credentials.

## Local backend

1. Install Node.js 20 or newer, Azure Functions Core Tools v4, and (for local storage emulation) Azurite.
2. In `api`, run `npm install`.
3. Copy `local.settings.example.json` to `local.settings.json`, then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to values from the Supabase project. Keep `local.settings.json` private and do not commit it.
4. Run `npm start` from `api`. The endpoints are `http://localhost:7071/api/contact` and `http://localhost:7071/api/assistant`.

## Deployment

Deploy the contents of `api` as an Azure Functions app running Node.js 20. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as application settings in Azure. Publish the static website to a host that routes `/api/*` to this function (Azure Static Web Apps supports this layout when the API app is linked). The current GitHub Pages site is static and cannot run Azure Functions; its contact form will show the phone fallback until the API is deployed and routed at `/api/contact`.

After deployment, submit a test inquiry and confirm it appears in the Supabase `contact_inquiries` table. Delete the test record afterward.

