// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Liste des modules natifs à ignorer sur web uniquement
const NATIVE_MODULES = [
  '@stripe/stripe-react-native',
  'react-native-google-mobile-ads',
  'react-native-maps',
  'react-native/Libraries/Utilities/codegenNativeCommands',
];

// Ignorer les modules natifs sur le web uniquement
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform, modulePath) => {
  // Si on essaie de bundler pour le web et que c'est un module natif
  if (platform === 'web') {
    // Vérifier le nom du module
    const isNativeModule = NATIVE_MODULES.some(nativeModule => 
      moduleName.includes(nativeModule) || 
      (modulePath && typeof modulePath === 'string' && modulePath.includes(nativeModule))
    );
    
    if (isNativeModule) {
      return {
        type: 'empty',
      };
    }
  }
  
  // Utiliser la résolution par défaut
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform, modulePath);
  }
  return context.resolveRequest(context, moduleName, platform, modulePath);
};

module.exports = config;
