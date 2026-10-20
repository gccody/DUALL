# DUALL

**Dual Offline Authentication Local Layer**  
A local-first, privacy-focused 2FA (two-factor authentication) mobile app built with Expo and TypeScript.

---

## 🚀 Features

- 🔒 Time-based One-Time Passwords (TOTP) fully managed on-device  
- 📱 QR code scanning for account setup  
- 🔑 Encrypted local storage of secrets (no cloud dependencies)  
- 🛡️ Biometric unlock (Face ID / Touch ID)  
- ⚙️ PIN fallback, dark mode, per-account code length & period  
- 📥 Import from Google Authenticator, 2FAS, Bitwarden, Ente Auth & LastPass export files  
- 📤 Export as a plain-text file of `otpauth://` URIs (unencrypted — keep it safe)  
- 🌐 Offline-first: app works without network access  

---

## 🧰 Tech Stack

- Expo (SDK 58) with a custom dev client  
- React Native & TypeScript  
- expo-secure-store for encrypted storage  
- crypto-es / hi-base32 for TOTP generation  
- expo-local-authentication for biometrics  
- expo-router for screen flows  
- react-native-vision-camera for QR scanning  
- Bun for package management and scripts, Jest (jest-expo) for tests  

---

## 📸 Demo

![Home Screen](docs/screenshots/home.png)  
![Add Account](docs/screenshots/add-account.png)  
![Backup & Restore](docs/screenshots/backup-restore.png)  

---

## 📥 Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.4 (package manager and script runner)  
- Node.js 22.13+ or 24.3+ (used by the Expo CLI under the hood)  
- Xcode (iOS) and/or Android Studio with an emulator, or a physical device  
- An [Expo](https://expo.dev) account if you want to build with EAS  

No global Expo CLI is needed; every command runs the project-local CLI through `bun x expo`.

> DUALL uses native modules (camera, secure store, biometrics) that are not part of Expo Go,
> so it runs in a custom **development build** rather than in Expo Go.

### Installation

```bash
git clone https://github.com/gccody/DUALL.git
cd DUALL
bun install
```

### Running the App

Build and install the dev client locally, then launch it (needs Xcode / Android Studio):

```bash
bun run android
# or
bun run ios
```

Once a development build is installed on your device or simulator, you only need Metro:

```bash
bun run start          # start Metro for the dev client
bun run start:remote   # same, through a tunnel (device on another network)
```

In the Metro terminal press **a** to open Android or **i** to open iOS.

### Development Builds with EAS

If you don't want to build locally, EAS can build and host the dev client for you:

```bash
bun run build:dev:android   # Android development build
bun run build:dev:ios       # iOS development build (registered devices)
bun run build:dev           # both platforms
```

These scripts set `EAS_SKIP_AUTO_FINGERPRINT=1` with POSIX shell syntax, so on Windows run them
from Git Bash or WSL.

### Scripts

| Command | What it does |
| --- | --- |
| `bun run start` | Start Metro for the development build |
| `bun run android` / `bun run ios` | Build the native app locally and run it |
| `bun run build:dev[:android\|:ios]` | Create a development build on EAS |
| `bun run test` | Run the Jest test suite |
| `bun run lint` | Lint the project with ESLint (`expo lint`) |
| `bun run fetch:data` | Refresh the bundled service icons from the 2FA directory and regenerate `utils/iconRegistry.generated.ts` (`bun run fetch:data --offline` regenerates it without network) |

### Versioning

`package.json` is the single source of the app version. `app.config.js` passes its `x.y.z` core
to the native builds (iOS requires a numeric version) and exposes the full string, prerelease tag
included, as `extra.displayVersion`, which the Settings screen shows. Build numbers are managed
remotely by EAS.

---

## 📖 Usage

1. **Onboard**  
   - Set up a 4-6 digit PIN.  
   - Enable Face ID / Touch ID (optional).

2. **Add Account**  
   - Open the **Add** tab  
   - Scan the account's QR code  
   - Assign a friendly name & icon

3. **Generate Codes**  
   - View live TOTP codes on the home screen  
   - Codes auto-refresh every period (30 seconds unless the account sets another)

4. **Import / Export**  
   - Import: **Settings → Import Codes**, choose the app and pick its export file  
   - Export: **Settings → Export Codes** shares a `.txt` file with one `otpauth://` URI per account  
   - The export is not encrypted: store it somewhere safe and delete it after use  

---

## 🗂 Project Structure

```
app/                     # expo-router routes (screens only — no business logic)
├── _layout.tsx          # Providers + root stack
├── pin-setup.tsx
└── (tabs)/              # Native tabs: (home), add, settings
    └── (home)/account/[uid]/   # Edit sheet and icon picker routes
core/                    # Pure TypeScript domain logic (no React), fully unit-tested
├── otp/                 # TOTP generation, otpauth:// parsing and building
├── import/              # One file per import provider (Google, 2FAS, Ente, Bitwarden, LastPass)
├── service.ts           # Service factory, duplicate detection, TOTP params
├── vault.ts             # Pure list operations (add, merge import, update, remove)
└── export.ts
storage/                 # Persistence: SecureStore secrets, AsyncStorage index/settings, migrations
context/                 # VaultProvider (accounts), SettingsProvider, ThemeProvider
hooks/                   # Screen-level behavior (useTotp, useCodeTransfer, useAppLock, …)
components/
├── accounts/            # AccountCard, ServiceIcon
├── settings/            # SettingsSection, SettingsRow, SettingsSwitch
└── ui/                  # Generic pieces (CenteredMessage, ProgressBar)
constants/theme.ts       # Light/dark palettes
utils/                   # PIN storage, icon matching, formatting helpers
scripts/                 # Icon registry generator, version bump
__tests__/               # Jest tests (bun run test)
```

Where to make common changes:

- **New import source** → add a provider in `core/import/providers/` and register it in `core/import/index.ts`.
- **New setting** → add the key to `Settings` (`types/index.ts`) and `DEFAULT_SETTINGS` (`storage/settings.ts`), then a `SettingsSwitch` row.
- **Account data changes** → go through `useVault()` actions; storage format changes need a step in `storage/migrations.ts`.

---

## 🤝 Contributing

1. Fork the repo  
2. Create a feature branch: `git checkout -b feat/your-feature`  
3. Commit your changes: `git commit -m "feat: add your feature"`  
4. Push to your branch: `git push origin feat/your-feature`  
5. Open a Pull Request  

Please ensure your code adheres to the existing style and passes linting/tests.

---

## 📝 License

This project is licensed under the MIT License.  
See [LICENSE](LICENSE) for details.

---

> Built with ❤️ using Expo & TypeScript  
> Questions? File an issue or drop a 👍 on the repo!