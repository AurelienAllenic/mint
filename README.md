# Mint – Expo Starter App

Bienvenue sur **Mint**, une application mobile universelle créée avec [Expo](https://expo.dev) et [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## 🚀 Démarrage rapide

1. **Installer les dépendances**

   ```bash
   npm install
   ```

2. **Lancer l’application**

   ```bash
   npx expo start
   ```

3. **Recuperer l'IP local de la machine**

Windows :

```sh
ipconfig
```

Mac : 

```bash
ifconfig
```

4. **Modifier le .env**

Renommer `.env.example` en `.env`, et remplacer : 

- `XXX.XX.XXX.X` par l'IP local de la machine récupèré précédement
- `PORT` par le port utilisé par le back (ici 3000)

```sh
EXPO_PUBLIC_API_URL="http://XXX.XX.XXX.X:[PORT]/api"
```

   Ouvre ensuite l’application sur :
   - un [build de développement](https://docs.expo.dev/develop/development-builds/introduction/)
   - un [émulateur Android](https://docs.expo.dev/workflow/android-studio-emulator/)
   - un [simulateur iOS](https://docs.expo.dev/workflow/ios-simulator/)
   - [Expo Go](https://expo.dev/go) sur ton appareil

3. **Développer**

   Modifie les fichiers dans le dossier **app**. Ce projet utilise le [file-based routing d’Expo Router](https://docs.expo.dev/router/introduction/).

## 📂 Structure du projet

```
mint/
├── app/                # Code principal de l’application (pages, navigation)
├── components/         # Composants réutilisables
├── hooks/              # Hooks personnalisés
├── constants/          # Constantes globales
├── scripts/            # Scripts utilitaires (ex: reset-project.js)
├── app-example/        # (optionnel) Ancien code déplacé après reset
├── package.json
└── README.md
```

## 📖 Ressources utiles

- [Documentation Expo](https://docs.expo.dev/)
- [Tutoriel Expo](https://docs.expo.dev/tutorial/introduction/)
- [Expo sur GitHub](https://github.com/expo/expo)
- [Communauté Discord](https://chat.expo.dev)