# DUALL

**Dual Offline Authentication Local Layer**  
A local-first, privacy-focused 2FA (two-factor authentication) mobile app built with Expo and TypeScript.

---

## 🚀 Features

- 🔒 Time-based One-Time Passwords (TOTP) fully managed on-device  
- 📱 QR code & manual entry for account setup  
- 🔑 Encrypted local storage of secrets (no cloud dependencies)  
- 🛡️ Biometric unlock (Face ID / Touch ID)  
- ⚙️ PIN fallback, dark mode, customizable code length & period  
- 🔄 Encrypted backup & restore via local file or AirDrop  
- 🌐 Offline-first: app works without network access  

---

## 🧰 Tech Stack

- Expo (SDK 57) with a custom dev client  
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
- Node.js LTS (used by the Expo CLI under the hood)  
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
| `bun run fetch:data` | Refresh the bundled service icons from the 2FA directory |

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
   - Tap **+**  
   - Scan the QR code or enter the secret manually  
   - Assign a friendly name & icon

3. **Generate Codes**  
   - View live TOTP codes on the home screen  
   - Codes auto-refresh every 30 seconds (configurable)

4. **Backup / Restore**  
   - Export encrypted backup file (.json) to local storage  
   - Import via file picker or AirDrop  

---

## 🗂 Project Structure

```
/duall
├── App.tsx              # Entry point
├── src/
│   ├── screens/         # All React screens
│   ├── components/      # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # TOTP logic, storage helpers
│   └── assets/          # Icons, images
├── docs/
│   └── screenshots/     # Demo images
├── app.json             # Expo config
├── package.json
└── tsconfig.json
```

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