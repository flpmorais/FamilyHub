# FamilyHub

A modular React Native app for managing family activities (tasks, groceries, and notes) built with Expo, Firebase, and TypeScript.

## 🏗️ Architecture

This app follows **Clean Architecture** principles with clear separation of concerns:

```
├── features/           # Feature modules (tasks, groceries, notes, settings, auth)
├── components/         # Shared reusable UI components
├── data/              # Local SQLite service and master-data sync logic
├── models/            # TypeScript interfaces for data models
├── repositories/      # Repository pattern abstractions
├── services/          # Firebase integration (auth, firestore, utilities)
├── navigation/        # React Navigation setup
└── App.tsx           # Main entry point
```

## 🚀 Features

- **User Authentication** - Firebase Auth with email/password
- **Task Management** - Create, assign, and track family tasks
- **Grocery Lists** - Collaborative shopping lists
- **Notes Sharing** - Family notes and information sharing
- **Offline Support** - SQLite for local master data
- **Real-time Sync** - Firebase Firestore for real-time updates

## 🛠️ Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **Firebase** (Auth, Firestore, Storage)
- **SQLite** for local data
- **React Navigation** for navigation
- **Clean Architecture** patterns

## 📦 Installation

1. **Prerequisites**
   ```bash
   # Install Node.js (if not already installed)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install node
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Setup**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Copy your Firebase config to `.env` file

4. **Environment Configuration**
   Update `.env` file with your Firebase configuration:
   ```env
   FIREBASE_API_KEY=your_api_key_here
   FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id
   ```

## 🚀 Running the App

```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios

# Run on web
npm run web
```

## 📱 App Structure

### Authentication Flow
- Firebase Authentication with email/password
- Session persistence with AsyncStorage
- Automatic navigation based on auth state

### Data Layer
- **Firebase Firestore** - Primary data store for real-time sync
- **SQLite** - Local storage for master data (categories, tags, etc.)
- **Repository Pattern** - Clean abstraction between UI and data

### Navigation
- **Stack Navigator** - Auth flow
- **Tab Navigator** - Main app sections (Tasks, Groceries, Notes, Settings)

### UI Components
- Reusable components with consistent styling
- iOS-style design system
- Loading states and error handling

## 🔧 Development

### Adding New Features
1. Create feature folder in `features/`
2. Add data models in `models/`
3. Implement repository in `repositories/`
4. Create UI components in `components/`
5. Update navigation in `navigation/`

### Code Style
- TypeScript strict mode
- ESLint configuration
- Clean Architecture patterns
- Repository pattern for data access

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions, please open an issue in the GitHub repository.
