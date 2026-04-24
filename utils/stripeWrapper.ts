import { Platform } from 'react-native';

// Wrapper pour Stripe qui retourne des mocks sur web
let StripeProvider: any;
let useStripe: any;

if (Platform.OS === 'web') {
  // Mock pour web
  StripeProvider = ({ children }: { children: React.ReactNode }) => children;
  useStripe = () => ({
    initPaymentSheet: async () => ({ error: null }),
    presentPaymentSheet: async () => ({ error: { code: 'NotSupported', message: 'Stripe is not supported on web' } }),
  });
} else {
  // Import réel pour native
  try {
    const stripeModule = require('@stripe/stripe-react-native');
    StripeProvider = stripeModule.StripeProvider;
    useStripe = stripeModule.useStripe;
  } catch (e) {
    // Fallback si l'import échoue
    StripeProvider = ({ children }: { children: React.ReactNode }) => children;
    useStripe = () => ({
      initPaymentSheet: async () => ({ error: null }),
      presentPaymentSheet: async () => ({ error: { code: 'NotSupported', message: 'Stripe is not available' } }),
    });
  }
}

export { StripeProvider, useStripe };
