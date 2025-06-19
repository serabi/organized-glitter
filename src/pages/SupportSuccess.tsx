import React from 'react';
import { CheckCircle, Heart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';

const SupportSuccess: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-6 text-center">
          {/* Success Icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>

          {/* Success Message */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-green-700">Thank You for Your Support!</h1>
            <p className="text-lg text-muted-foreground">
              Your contribution helps keep Organized Glitter running and accessible to everyone.
            </p>
          </div>

          {/* Details Card */}
          <div className="space-y-4 rounded-lg border border-green-200 bg-card p-6">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <Heart className="h-5 w-5" />
              <span className="font-medium">Payment Successful</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You should receive a confirmation email from PayPal shortly. Your support makes a real
              difference in keeping this platform free and improving.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild className="bg-[#FF6B81] text-white hover:bg-[#FF6B81]/90">
              <Link to="/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link to="/profile" className="flex items-center gap-2">
                View Settings
              </Link>
            </Button>
          </div>

          {/* Additional Message */}
          <div className="mt-8 rounded-lg bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Have questions or feedback? Feel free to{' '}
              <a
                href="mailto:contact@organizedglitter.app"
                className="text-[#FF6B81] underline hover:text-[#FF6B81]/80"
              >
                reach out to us
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default SupportSuccess;
