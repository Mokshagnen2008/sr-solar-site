# SR Solar backend setup

The contact API is an Azure Functions v4 Node.js function. It saves website inquiries to the existing Supabase project. The Supabase service-role key is read only by the function and must never be added to website JavaScript or committed to source control.

The admin page supports email verification links, project photo upload/removal, and an admin-only visit total. It previews a selected photo before upload and uses Supabase's browser-only sign-in flow because the current site is static GitHub Pages. Public pages record page visits; only the admin page can read the total, and public visitors cannot read individual visit records.

## One-time Supabase setup

Run the updated `supabase-setup.sql` in the Supabase SQL Editor. It creates `contact_inquiries` with row-level security enabled and no public table access. The function writes through the server-only service-role key.

The same SQL also configures the public photo bucket, admin-only photo management, visit tracking, and a read-only aggregate visit-count function. In Supabase Authentication URL settings, allow the deployed site's `/admin.html` URL as an email sign-in redirect and enable email sign-in. Only the address in `ADMIN_EMAIL` can open the admin tools. The admin types that authorized address and opens the emailed one-time link on whichever device should hold the admin session. Access is checked against the verified email account; no device is enrolled or approved. Keep `ADMIN_EMAIL` and the email checks in `supabase-setup.sql` aligned.

## Local backend

1. Install Node.js 20 or newer, Azure Functions Core Tools v4, and (for local storage emulation) Azurite.
2. In `api`, run `npm install`.
3. Copy `local.settings.example.json` to `local.settings.json`, then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to values from the Supabase project. Keep `local.settings.json` private and do not commit it.
4. Run `npm start` from `api`. The contact endpoint is `http://localhost:7071/api/contact`.

## Deployment

Deploy the contents of `api` as an Azure Functions app running Node.js 20. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as application settings in Azure. Publish the static website to a host that routes `/api/*` to this function (Azure Static Web Apps supports this layout when the API app is linked). The current GitHub Pages site is static and cannot run Azure Functions; its contact form will show the phone fallback until the API is deployed and routed at `/api/contact`.

After deployment, submit a test inquiry and confirm it appears in the Supabase `contact_inquiries` table. Delete the test record afterward.

