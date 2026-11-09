# Installation and update guide

How to install Paul's Custom Cards on a Raspberry Pi running **Home Assistant OS**, update them remotely afterwards, and remove them.

- [Before you start](#before-you-start)
- [Connecting to the Pi](#connecting-to-the-pi)
- [Install from Marketplace (recommended)](#install-from-marketplace-recommended)
- [Install without Marketplace](#install-without-marketplace)
- [Check it worked](#check-it-worked)
- [Updating (remotely)](#updating-remotely)
- [Troubleshooting](#troubleshooting)
- [Uninstall](#uninstall)

## Before you start

- Home Assistant OS is already running on the Pi, onboarded, and on **Home Assistant 2026.11 or later**, which has the built-in [Marketplace](https://www.home-assistant.io/integrations/marketplace/). If it's older, update it first under **Settings → Updates**. A Pi that already had the cards through HACS is moved to Marketplace automatically, and the cards keep working.
- The Pi's network connection reaches the internet, because installs and updates download from GitHub.
- You have an **admin** login for the customer's Home Assistant.
- You have a **GitHub account**. Marketplace needs one to add repositories that aren't in its catalog, like this one. It only asks for read access to public repositories.

Whichever way you install, every later update can be done remotely through the web UI. You never need SSH or file-share access to the Pi.

## Connecting to the Pi

**On site:** connect your laptop to the customer's network (Wi-Fi or Ethernet) and open **http://homeassistant.local:8123**.

If that address doesn't load (some Windows and Android devices don't resolve `.local` names), find the Pi's IP address in the customer's router device list. It's usually named `homeassistant`. Then open `http://<ip-address>:8123`.

**Remotely:** open the customer's remote address in your browser, for example their HTTPS subdomain, and log in with the admin account.

## Install from Marketplace (recommended)

1. Go to **Settings → Marketplace**. The first time, read the warning about community content and accept it.
2. Select **Add from link** (top right). Under **GitHub link**, enter `keteracel/pauls-custom-cards` and select **Add**. If it asks for a **Type**, choose **Dashboard** and select **Add** again.
3. If Marketplace asks you to connect GitHub, select **Continue**, enter the code it shows on the GitHub page that opens, and approve it.
4. Open **Paul's Custom Cards**, select **Install**, check the version (the latest release), and select **Install** again.
5. If a repair under **Settings → System → Repairs** asks for a restart, let it restart. This happens when the Pi had no `www` folder yet.
6. Hard-reload the browser (**Ctrl+Shift+R**, or **Cmd+Shift+R** on Mac).

Marketplace installs the cards to `config/www/community/pauls-custom-cards/` and registers them with your dashboards as `/local/community/pauls-custom-cards/pauls-cards.js`. It also offers updates when new versions come out.

## Install without Marketplace

Use this only if you'd rather not connect a GitHub account to the customer's Home Assistant, which Marketplace needs for repositories outside its catalog. Home Assistant downloads the file from GitHub itself, so updates still work remotely.

1. Turn on **Advanced mode**: click your user name at the bottom of the sidebar.
2. Install the **File editor** add-on: go to **Settings → Add-ons → Add-on store**, choose **File editor**, then **Install**. Turn on **Show in sidebar**, then click **Start**.
3. In **File editor**, open `configuration.yaml` and add the following at the end. If there's already a `shell_command:` line, add only the `pauls_cards_update` lines under it.

   ```yaml
   shell_command:
     # Downloads the latest Paul's Custom Cards release into /config/www.
     pauls_cards_update: >-
       sh -c 'set -e; mkdir -p /config/www;
       curl -fsSL --max-time 45 -o /config/www/pauls-cards.js.new
       https://github.com/keteracel/pauls-custom-cards/releases/latest/download/pauls-cards.js;
       mv /config/www/pauls-cards.js.new /config/www/pauls-cards.js;
       echo "pauls-cards.js updated: $(wc -c < /config/www/pauls-cards.js) bytes"'
   ```

4. Save. Go to **Developer tools → YAML**, click **Check configuration**, then **Restart**.
5. Go to **Developer tools → Actions**, run **Shell Command: pauls_cards_update**, and check the response shows `returncode: 0`.
6. If `/config/www` didn't exist before step 5, restart once more. Home Assistant only serves a `www` folder that existed when it started.
7. Go to **Settings → Dashboards**, open the **⋮** menu, and choose **Resources**. Click **Add resource**:
   - **URL:** `/local/pauls-cards.js?v=0.10.0`, using the [latest release](https://github.com/keteracel/pauls-custom-cards/releases/latest) number
   - **Resource type:** JavaScript module
8. Hard-reload the browser.

## Check it worked

1. Open a dashboard, click the pencil icon, and choose **Add card**.
2. Search for **Paul**. You should see **Paul's Gauge Card**, **Paul's Flow Card** and **Paul's Wind Card**.
3. Check the customer's phone or wall tablet too. If the cards show "Custom element doesn't exist", in the Companion app open **Settings → Companion app → Debugging → Reset frontend cache**.

The cards take their colours from the Home Assistant theme, so they match the [EcoVolt theme](https://github.com/keteracel/ecovolt-ha-theme) automatically.

## Updating (remotely)

Everything here works through the customer's remote address in a browser. Read the [release notes](https://github.com/keteracel/pauls-custom-cards/releases) first: any change that affects existing cards is called out there.

### With Marketplace

1. Go to **Settings → Updates**, select **Paul's Custom Cards**, read the release notes, and install the update.
2. Reload the page.

Marketplace checks this repository about every 2 days, so a new release can take that long to show up. It also changes the resource URL for each version, so the customer's devices pick up the new version on their next page load. No cache clearing is needed.

### Without Marketplace

1. Run **Shell Command: pauls_cards_update** from **Developer tools → Actions** and check it shows `returncode: 0`.
2. Go to **Settings → Dashboards → ⋮ → Resources**, open the `pauls-cards.js` entry, and change the `?v=` number to the new version, for example `/local/pauls-cards.js?v=0.10.0`.
3. Reload the page.

The `?v=` change is what makes the customer's devices fetch the new file. Home Assistant lets browsers cache `/local` files for 31 days, and you can't clear a tablet's cache remotely.

### Going back to an older version

- **Marketplace:** open **Paul's Custom Cards** in **Settings → Marketplace**, choose **⋮ → Install another version**, and pick the older version. Home Assistant's docs recommend restoring a backup to undo an update instead; that matters mostly for integrations, but it's the safer route if anything else changed at the same time.
- **Without Marketplace:** the update action always fetches the latest release. To roll back, temporarily change `latest/download` in the `shell_command` to `download/v0.9.0` (the version you want), restart, run the action, and set the resource's `?v=` to match.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Card shows **"Custom element doesn't exist: paul-…-card"** | The resource isn't loading. Check it's listed under **Settings → Dashboards → ⋮ → Resources** as a **JavaScript module**, then reload. For installs without Marketplace, open `<ha-address>/local/pauls-cards.js`: a 404 means the file isn't there or HA needs a restart. |
| Old version still showing after an update | Without Marketplace, bump the resource's `?v=` number. On one device you're holding, reset the Companion app's frontend cache. |
| Cards missing from the **Add card** picker | Reload the page. The picker only lists cards once the script has loaded. |
| **Add from link** fails or asks for GitHub | Connect GitHub when prompted. To connect or change the account later, open **Settings → Devices & services → Marketplace → ⋮ → Reconfigure**. If it asks for a **Type**, choose **Dashboard**. |
| No update shows up for a new release | Marketplace checks this repository about every 2 days. Compare the installed version on the repository page with the [latest release](https://github.com/keteracel/pauls-custom-cards/releases/latest). |
| The update action returns a non-zero `returncode` | The Pi couldn't reach GitHub. Check **Settings → System → Network**. The existing file is left in place when a download fails. |

## Uninstall

1. Remove the cards from all dashboards first. Otherwise they show "Custom element doesn't exist".
2. Remove the files:
   - **Marketplace:** open **Paul's Custom Cards** in **Settings → Marketplace** and choose **⋮ → Uninstall**, then confirm. Marketplace deletes the files and the resource.
   - **Without Marketplace:** delete the `pauls-cards.js` resource under **Settings → Dashboards → ⋮ → Resources**. In **File editor**, delete `www/pauls-cards.js`, remove the `pauls_cards_update` block from `configuration.yaml`, then restart.
3. Reload the page.
