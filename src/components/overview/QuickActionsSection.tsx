import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, Package, Trophy } from 'lucide-react';

/**
 * Created 2025-05-26 while refactoring Overview.tsx
 * Quick action buttons section for navigation to different project statuses
 */
export function QuickActionsSection() {
  const navigate = useNavigate();

  return (
    <section>
      <h2 className="mb-6 text-2xl font-semibold">
        <span className="bg-gradient-to-r from-primary to-flamingo-400 bg-clip-text text-transparent">
          Quick Actions
        </span>
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Button
          className="flex h-20 flex-col justify-center gap-2 transition-transform hover:scale-105 hover:bg-muted"
          onClick={() => navigate('/dashboard?status=wishlist')}
          variant="outline"
        >
          <Heart className="h-5 w-5 text-pink-500" />
          <span>View Wishlist</span>
        </Button>
        <Button
          className="flex h-20 flex-col justify-center gap-2 transition-transform hover:scale-105 hover:bg-muted"
          onClick={() => navigate('/dashboard?status=stash')}
          variant="outline"
        >
          <Package className="h-5 w-5 text-blue-500" />
          <span>See Your Stash</span>
        </Button>
        <Button
          className="flex h-20 flex-col justify-center gap-2 transition-transform hover:scale-105 hover:bg-muted"
          onClick={() => navigate('/dashboard?status=completed')}
          variant="outline"
        >
          <Trophy className="h-5 w-5 text-amber-500" />
          <span>See Completed</span>
        </Button>
      </div>
    </section>
  );
}
