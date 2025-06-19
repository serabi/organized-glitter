import React, { useEffect } from 'react';
import { Heart, Search } from 'lucide-react';

// Declare PayPal global to avoid TypeScript errors
interface PayPalButtonConfig {
  env: 'production' | 'sandbox';
  hosted_button_id: string;
  image: {
    src: string;
    alt: string;
    title: string;
  };
}

declare global {
  interface Window {
    PayPal?: {
      Donation: {
        Button: (config: PayPalButtonConfig) => {
          render: (selector: string) => void;
        };
      };
    };
  }
}

const PayPalSupportSection: React.FC = () => {
  useEffect(() => {
    // Load PayPal SDK script
    const script = document.createElement('script');
    script.src = 'https://www.paypalobjects.com/donate/sdk/donate-sdk.js';
    script.charset = 'UTF-8';
    script.onload = () => {
      // Initialize PayPal donate button after script loads
      if (window.PayPal) {
        window.PayPal.Donation.Button({
          env: 'production',
          hosted_button_id: 'TZ5FW9R4SLVJJ',
          image: {
            src: 'https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif',
            alt: 'Donate with PayPal button',
            title: 'PayPal - The safer, easier way to pay online!',
          },
        }).render('#donate-button');
      }
    };

    // Only add script if it doesn't already exist
    if (
      !document.querySelector(
        'script[src="https://www.paypalobjects.com/donate/sdk/donate-sdk.js"]'
      )
    ) {
      document.head.appendChild(script);
    } else if (window.PayPal) {
      // Script already loaded, just render the button
      window.PayPal.Donation.Button({
        env: 'production',
        hosted_button_id: 'TZ5FW9R4SLVJJ',
        image: {
          src: 'https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif',
          alt: 'Donate with PayPal button',
          title: 'PayPal - The safer, easier way to pay online!',
        },
      }).render('#donate-button');
    }

    // Cleanup function
    return () => {
      // Clear the donate button container when component unmounts
      const container = document.getElementById('donate-button');
      if (container) {
        container.replaceChildren();
      }
    };
  }, []);

  return (
    <div
      id="support"
      className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow"
    >
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Heart className="h-5 w-5 text-red-500" />
          Support Organized Glitter
        </h2>
      </div>

      <div className="space-y-6">
        {/* Main Section - Two Column Layout */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left Column - PayPal Donation */}
          <div className="rounded-lg border border-border bg-background/50 p-6">
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <h3 className="text-lg font-semibold">Donate via PayPal</h3>
              </div>

              {/* PayPal Donation Button */}
              <div className="flex justify-center pt-2">
                <div id="donate-button-container">
                  <div id="donate-button"></div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Secure donation via PayPal • No account required
              </p>
            </div>
          </div>

          {/* Right Column - Transparency Section */}
          <div className="rounded-lg border border-border bg-background/50 p-6">
            <h4 className="mb-4 flex items-center gap-2 text-lg font-medium">
              <Search className="h-5 w-5" />
              Transparency
            </h4>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Donations help cover server hosting, database costs, and domain fees. Organized
              Glitter remains 100% free for everyone regardless of donations. We're grateful for any
              support that helps keep this service running!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayPalSupportSection;
