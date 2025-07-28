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

- Expo (SDK 48+)  
- React Native & TypeScript  
- expo-secure-store for encrypted storage  
- react-native-crypto / js-otp for TOTP  
- expo-local-authentication for biometrics  
- react-navigation for screen flows  

---

## 📸 Demo

![Home Screen](docs/screenshots/home.png)  
![Add Account](docs/screenshots/add-account.png)  
![Backup & Restore](docs/screenshots/backup-restore.png)  

---

## 📥 Getting Started

### Prerequisites

- Node.js ≥ 16.x  
- Yarn or npm  
- Expo CLI  
- iOS Simulator or Android Emulator (or a physical device)

```bash
npm install --global expo-cli
```

### Installation

```bash
git clone https://github.com/<your-username>/duall.git
cd duall
yarn install
```

### Running the App

Start Metro bundler:

```bash
yarn start
```

Then, in the Expo DevTools:

- Press **a** to launch on Android emulator/device  
- Press **i** to launch on iOS simulator/device  

Or run directly:

```bash
expo run:android
# or
expo run:ios
```

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

## ⚙️ Configuration

You can tweak default settings in `app.json` under the `"expo.extra"` section:

```json
{
  "expo": {
    "extra": {
      "defaultPeriod": 30,
      "defaultDigits": 6,
      "enableBiometrics": true
    }
  }
}
```

At runtime these values are available via `Constants.expoConfig.extra`.

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