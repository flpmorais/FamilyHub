**FamilyHub — Environment Setup Guide**  
This guide walks you through setting up a new environment (development, preview, or production) for the FamilyHub app. It covers Supabase, Google Cloud, Expo (EAS), building, and configuring Google Sign-In.  
The steps must be followed in this exact order to avoid circular dependencies.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OQQmAABRAsSdYxZ4/mJjEsxE8W8GbCFuCLTOzVXsAAPzFuVZ3dXw9AQDgtesBxPEF3bv7x0IAAAAASUVORK5CYII=)  
**Table of Contents**  
1. [Prerequisites](#anchor-1 "#anchor-1")  
2. [Supabase Project](#anchor-2 "#anchor-2")  
3. [Google Cloud Project — Part 1 (Web Client only)](#anchor-3 "#anchor-3")  
4. [Configure Supabase Google Auth](#anchor-4 "#anchor-4")  
5. [Expo / EAS Project](#anchor-5 "#anchor-5")  
6. [Environment File](#anchor-6 "#anchor-6")  
7. [Database Setup](#anchor-7 "#anchor-7")  
8. [First Build (generates the signing keystore)](#anchor-8 "#anchor-8")  
9. [Google Cloud — Part 2 (Android Client with SHA-1)](#anchor-9 "#anchor-9")  
10. [Verify Everything Works](#anchor-10 "#anchor-10")  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAALUlEQVR4nO3OQQ0AIAwEsAMlSJ0UrOFkGngRklZBR1WtJDsAAPzizNcDAADuNcKwAyU+nb+5AAAAAElFTkSuQmCC)  
**1. Prerequisites**  
- Node.js >= 20  
- npm >= 10  
- Android Studio (for emulator or device debugging)  
- Supabase CLI: npm install -g supabase  
- A Google account  
- A Supabase account ([https://supabase.com)](https://supabase.com "https://supabase.com")  
- An Expo account ([https://expo.dev)](https://expo.dev "https://expo.dev")  
***Note:*** * You do NOT need to install * *eas-cli* * globally. All EAS commands can be run via * *npx eas-cli <command>* *.*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OMQ2AABAAsSNhRAF6EPYDLhGADSywEZJWQZeZ2aszAAD+4l6rrTq+ngAA8Nr1AIWsBDYDm5cLAAAAAElFTkSuQmCC)  
**2. Supabase Project**  
We start here because we need the project URL before configuring Google Cloud.  
**2a. Create the project**  
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard "https://supabase.com/dashboard")  
2. Click **New Project**  
3. Fill in:  
- **Organization:** select or create one  
- **Name:**familyhub-<environment> (e.g., familyhub-production)  
- **Database Password:** generate a strong password and  **save it** — you'll need it later for the CLI  
- **Region:** choose the closest to your users  
- **Pricing plan:** Free tier or Pro  
4. Click **Create new project**  
5. Wait for the project to finish provisioning  
**2b. Get your project credentials**  
1. Go to **Settings** (gear icon, left sidebar) >  **API**  
2. Copy and save these values:  
| | | |  
|-|-|-|  
| **Value** | **Where to find it** | **What it's for** |   
| **Project URL** | Top of the API page | SUPABASE_URL in .env |   
| **anon public key** | Under settings -> "Project API keys" – publishable key | SUPABASE_ANON_KEY in .env |   
| **service_role key** | Click "Reveal" under "Project API keys" | Running the seed script (do NOT put in the app) |   
| **Project ID** | The subdomain of the URL (e.g., abcdefghijklmnop from https://abcdefghijklmnop.supabase.co) | Supabase CLI linking and Google redirect URI |   
   
**2c. Create storage buckets**  
1. Go to **Storage** (left sidebar)  
2. Click **New bucket**, create these 3 buckets:  
| | | |  
|-|-|-|  
| **Bucket name** | **Public** | **File size limit** |   
| avatars | Yes | 5MB |   
| family-banners | Yes | 5MB |   
| vacation-covers | Yes | 5MB |   
   
1. For **each** bucket, go to  **Policies** and add a policy:  
- Click **New Policy** >  **For full customization**  
- Policy name: Allow authenticated users  
- Allowed operations: SELECT, INSERT, UPDATE, DELETE  
- Target roles: authenticated  
- USING expression: true  
- WITH CHECK expression: true  
- Click **Save**  
**2d. Configure Supabase Auth URL settings**  
1. Go to **Authentication** (left sidebar) >  **URL Configuration**  
2. Set **Site URL** to:  
3. familyhub://  
   
4. Under **Redirect URLs**, add:  
5. familyhub://  
   
6. Click **Save**  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OMQ2AABAAsSNBCUpfEJ5YGBDBgAU2QtIq6DIzW7UHAMBfHGt1V+fXEwAAXrseHDYF+yOk59sAAAAASUVORK5CYII=)  
**3. Google Cloud Project — Part 1 (Web Client only)**  
At this stage we only create the **Web Client**. The Android Client requires a SHA-1 fingerprint that we don't have yet (it comes from the first EAS build in step 8).  
**3a. Create the project**  
1. Go to [https://console.cloud.google.com](https://console.cloud.google.com "https://console.cloud.google.com")  
2. Click the project dropdown (top-left, next to "Google Cloud")  
3. Click **New Project**  
4. Name: FamilyHub <environment> (e.g., FamilyHub Production)  
5. Click **Create**  
6. Select the new project from the dropdown  
**3b. Enable the required API**  
1. Go to **APIs & Services** >  **Library** (left sidebar)  
2. Search for **"Google Identity Toolkit API"**  
3. Click it, then click **Enable**  
**3c. Configure OAuth Consent Screen**  
1. Go to **APIs & Services** >  **OAuth consent screen** (left sidebar)  
2. Select **External** user type, click  **Create**  
3. Fill in:  
- **App name:**FamilyHub  
- **User support email:** your email  
- **Developer contact information:** your email  
4. Click **Save and Continue**  
5. **Scopes:** click  **Add or Remove Scopes**, select:  
- openid  
- email  
- profile  
6. Click **Update**, then  **Save and Continue**  
7. **Test users:** add the Google email(s) of everyone who will use the app, click  **Save and Continue**  
8. Review and click **Back to Dashboard**  
**3d. Create OAuth 2.0 Credentials — Web Client**  
1. Go to **APIs & Services** >  **Credentials** (left sidebar)  
2. Click **+ Create Credentials** >  **OAuth client ID**  
3. Application type: **Web application**  
4. Name: FamilyHub Web Client  
5. **Authorized redirect URIs:** add:  
6. https://<your-supabase-project-id>.supabase.co/auth/v1/callback  
   
7.   
 Replace <your-supabase-project-id> with the Project ID from step 2b.  
8. Click **Create**  
9. **Save these values:**  
| | |  
|-|-|  
| **Value** | **What it's for** |   
| **Client ID** | GOOGLE_WEB_CLIENT_ID in .env file, and Supabase Google provider config |   
| **Client Secret** | Supabase Google provider config only (NOT in .env) |   
   
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OMQ2AABAAsSNhwgJOUPcjIpnRgQU2QtIq6DIze3UGAMBf3Gu1VcfXEwAAXrseaJEEL8XMiYMAAAAASUVORK5CYII=)  
**4. Configure Supabase Google Auth**  
1. Go to Supabase Dashboard > **Authentication** (left sidebar) >  **Providers**  
2. Find **Google** in the list, click to expand  
3. Toggle **Enable Google provider** to ON  
4. Fill in:  
- **Client ID:** paste the  **Web Client ID** from step 3d  
- **Client Secret:** paste the  **Client Secret** from step 3d  
5. Click **Save**  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OQQmAABRAsSfYxZo/jzlMYQLPJrCCNxG2BFtmZquOAAD4i3Ot7mr/egIAwGvXA4q7Bc870TqdAAAAAElFTkSuQmCC)  
**5. Expo / EAS Project**  
**5a. Log in to EAS**  
npx eas-cli login  
   
Enter your Expo account email and password.  
**5b. Create or link the EAS project**  
**If creating a new EAS project:**  
1. Go to [https://expo.dev and create a new project, or run:](https://expo.dev "https://expo.dev")  
2. npx eas-cli init  
   
3. Copy the **project ID** shown (a UUID like 373701cc-d3cf-495d-9853-e36487965d6e)  
**If linking to an existing EAS project:**  
1. Go to [https://expo.dev > click your project > **Settings**](https://expo.dev "https://expo.dev")  
2. Copy the **project ID**  
Your project ID goes into the EAS_PROJECT_ID variable in the .env file.  
***Note:*** * Because this app uses dynamic config (* *app.config.ts* *), EAS can't auto-write the project ID to config files. That's fine — it reads from * *process.env.EAS_PROJECT_ID* * at build time via the * *.env* * file.*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OMQ2AABAAsSNhwgJWEPcbJpnRgQU2QtIq6DIze3UGAMBf3Gu1VcfXEwAAXrseaIkEMIPgIvAAAAAASUVORK5CYII=)  
**6. Environment File**  
Create or edit the .env.<environment> file in the project root. EAS reads the file matching the build profile name:  
| | |  
|-|-|  
| **File** | **Used when** |   
| .env.development | Local development (npx expo start) |   
| .env.preview | npx eas-cli build --profile preview |   
| .env.production | npx eas-cli build --profile production |   
   
**Fill in the values**  
# Supabase (from step 2b)  
 SUPABASE_URL=https://<project-id>.supabase.co  
 SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...  
   
 # Expo / EAS (from step 5b)  
 EAS_PROJECT_ID=<eas-project-uuid>  
   
 # PowerSync (optional — leave empty if not using)  
 POWERSYNC_URL=  
   
 # Google Auth (from step 3d — the Web Client ID, NOT the secret)  
 GOOGLE_WEB_CLIENT_ID=<number>.apps.googleusercontent.com  
   
**Quick reference: where each value comes from**  
| | |  
|-|-|  
| **Variable** | **Source** |   
| SUPABASE_URL | Supabase Dashboard > Settings > API > Project URL |   
| SUPABASE_ANON_KEY | Supabase Dashboard > Settings > API > anon public key |   
| EAS_PROJECT_ID | Expo Dashboard > your project > Settings, or eas init output |   
| POWERSYNC_URL | PowerSync Dashboard (if using), otherwise leave empty |   
| GOOGLE_WEB_CLIENT_ID | Google Cloud Console > APIs & Services > Credentials > Web Client > Client ID |   
   
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OYQ1AABSAwY9JoICqL4Z8Ikiggn9mu0twy8wc1RkAAH9xbdVa7V9PAAB47X4A9CgEJQFjJ/EAAAAASUVORK5CYII=)  
**7. Database Setup**  
**7a. Link Supabase CLI to the new project**  
npx supabase login  
 npx supabase link --project-ref <project-id>  
   
Replace <project-id> with the subdomain from your Supabase URL (e.g., abcdefghijklmnop).  
You'll be prompted for the database password you set in step 2a.  
**7b. Apply all migrations**  
npx supabase db push  
   
This applies all migration files from supabase/migrations/ to the remote database, creating all tables, RLS policies, and functions.  
**7c. Run the seed script (if available)**  
If a seed script exists at tmp/seed.sql:  
1. Go to Supabase Dashboard > **SQL Editor**  
2. Paste the contents of the seed file  
3. Click **Run**  
This inserts your family data, profiles, tags, categories, and templates.  
**7d. Verify the provision_user_account function**  
The app relies on a PostgreSQL function provision_user_account() that should have been created by the migrations. Verify it exists:  
1. Go to Supabase Dashboard > **SQL Editor**  
2. Run:  
3. SELECT proname FROM pg_proc WHERE proname = 'provision_user_account';  
   
4. It should return one row  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANElEQVR4nO3OQQmAABRAsad4EEtY9QcxnUms4E2ELcGWmTmrKwAA/uLeqrU6vp4AAPDa/gDzXgM37EF77AAAAABJRU5ErkJggg==)  
**8. First Build (generates the signing keystore)**  
Now build the APK. This is the step where EAS generates the Android signing keystore — which gives you the SHA-1 fingerprint needed for the Google Android Client.  
**8a. Set the EAS project ID in your shell**  
Because the app uses dynamic config, EAS needs the project ID as an environment variable:  
export EAS_PROJECT_ID=<your-eas-project-uuid>  
   
**8b. Build the APK**  
npx eas-cli build --profile production --platform android  
   
- EAS will ask: **"Generate a new Android Keystore?"** — say  **Yes**  
- The build is queued in the cloud (free tier may take 10-30 min to start)  
- When done, you'll get a download link for the APK  
**8c. Get the SHA-1 fingerprint**  
After the build completes, the keystore exists. Get the SHA-1:  
export EAS_PROJECT_ID=<your-eas-project-uuid>  
 npx eas-cli credentials -p android  
   
Or find it in the Expo Dashboard:  
1. Go to [https://expo.dev](https://expo.dev "https://expo.dev")  
2. Click your project  
3. Go to **Credentials** (left sidebar)  
4. Under **Android**, the keystore SHA-1 fingerprint is displayed  
**Copy the SHA-1** — you need it for the next step.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OMQ2AABAAsSNBCUrfDqrYGVDAgAU2QtIq6DIzW7UHAMBfHGt1V+fXEwAAXrseHCQGBEuErVgAAAAASUVORK5CYII=)  
**9. Google Cloud — Part 2 (Android Client with SHA-1)**  
Now that you have the SHA-1 from the EAS build, create the Android OAuth client.  
**9a. Create the Android Client**  
1. Go to Google Cloud Console > **APIs & Services** >  **Credentials**  
2. Click **+ Create Credentials** >  **OAuth client ID**  
3. Application type: **Android**  
4. Name: FamilyHub Android  
5. **Package name:**com.morais.familyhub  
6. **SHA-1 certificate fingerprint:** paste the SHA-1 from step 8c  
7. Click **Create**  
**9b. (Optional) Add debug SHA-1**  
If you also want Google Sign-In to work on your local development builds:  
1. Get your debug keystore SHA-1:  
2. keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android  
   
3. Go back to the Android OAuth client you just created  
4. Click **Edit** >  **Add fingerprint**  
5. Paste the debug SHA-1  
6. Click **Save**  
***Note:*** * You can have multiple SHA-1 fingerprints on the same Android OAuth client. This lets both debug and production builds use the same client.*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OMQ2AABAAsSPBCj7fFjsymJHAjAU2QtIq6DIzW7UHAMBfnGt1V8fXEwAAXrsexNkF4H1/HJoAAAAASUVORK5CYII=)  
**10. Verify Everything Works**  
**10a. Install and test**  
1. Download the APK from the EAS build link (step 8b)  
2. Install it on your Android device  
3. Open the app  
4. Tap **Google Sign-In**  
5. Complete the OAuth flow  
6. You should land on the dashboard  
**10b. Troubleshooting Google Sign-In**  
If sign-in fails, check these in order:  
| | |  
|-|-|  
| **Check** | **Where** |   
| Web Client ID in .env matches Google Cloud | .env.production vs Google Cloud > Credentials > Web Client |   
| Supabase Google provider has correct Client ID + Secret | Supabase > Authentication > Providers > Google |   
| Redirect URI in Google Cloud includes Supabase callback | Google Cloud > Credentials > Web Client > Authorized redirect URIs |   
| Android Client SHA-1 matches the build keystore | Google Cloud > Credentials > Android Client vs eas credentials output |   
| Test users include your Google email | Google Cloud > OAuth consent screen > Test users |   
   
**10c. Test data**  
- Check that your family, profiles, tags, categories, and templates appear in the app  
- If they don't, verify the seed script ran correctly (step 7c)  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OMQ2AABAAsSNhZscaUpheJwqQgQU2QtIq6DIze3UGAMBf3Gu1VcfXEwAAXrseopcEQ2uoYnwAAAAASUVORK5CYII=)  
**Quick Reference: All External Services**  
| | | |  
|-|-|-|  
| **Service** | **URL** | **What you need from it** |   
| Supabase Dashboard | [https://supabase.com/dashboard](https://supabase.com/dashboard "https://supabase.com/dashboard") | Project URL, anon key, service role key, auth config, storage buckets |   
| Google Cloud Console | [https://console.cloud.google.com](https://console.cloud.google.com "https://console.cloud.google.com") | Web Client ID + Secret, Android Client with SHA-1 |   
| Expo Dashboard | [https://expo.dev](https://expo.dev "https://expo.dev") | EAS project ID, build links, credentials/SHA-1 |   
| PowerSync (optional) | [https://powersync.com](https://powersync.com "https://powersync.com") | Sync server URL |   
   
