// Mock vide pour Stripe sur web
// Stripe React Native n'est pas compatible avec le web, donc on retourne des mocks vides
// Ce fichier est utilisé par Metro quand on bundler pour le web

const React = require('react');

const StripeProvider = ({ children }) => children;

const useStripe = () => ({
  initPaymentSheet: async () => ({ error: null }),
  presentPaymentSheet: async () => ({ 
    error: { 
      code: 'NotSupported', 
      message: 'Stripe is not supported on web platform' 
    } 
  }),
  confirmPayment: async () => ({ 
    error: { 
      code: 'NotSupported', 
      message: 'Stripe is not supported on web platform' 
    } 
  }),
  retrievePaymentIntent: async () => ({ 
    error: { 
      code: 'NotSupported', 
      message: 'Stripe is not supported on web platform' 
    } 
  }),
});

module.exports = {
  StripeProvider,
  useStripe,
  __esModule: true,
  default: {
    StripeProvider,
    useStripe,
  },
};
