import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { SpinRecord } from '@/services/pocketbase/randomizerService';
import { ExternalLink, History, Trash2 } from 'lucide-react';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('SpinHistory');

interface SpinHistoryProps {
  history: SpinRecord[];
  isLoading?: boolean;
  onClearHistory?: () => void;
}

export const SpinHistory: React.FC<SpinHistoryProps> = ({
  history,
  isLoading = false,
  onClearHistory,
}) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInHours * 60);
        return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
      } else if (diffInHours < 168) { // 7 days
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      logger.error('Error formatting date', { dateString, error });
      return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="w-5 h-5" />
            Spin History
          </h3>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3 border rounded-lg space-y-2">
              <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="w-1/2 h-3 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <History className="w-5 h-5" />
          Spin History
        </h3>
        {history.length > 0 && onClearHistory && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              logger.debug('Clear history button clicked');
              onClearHistory();
            }}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* History list */}
      {history.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-base mb-1">No spins yet</p>
          <p className="text-sm">Your spin history will appear here</p>
        </div>
      ) : (
        <ScrollArea className="h-80">
          <div className="space-y-2 pr-4">
            {history.map((spin, index) => (
              <div
                key={spin.id}
                className="p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{spin.project_title}</p>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Latest
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatDate(spin.spun_at)}</span>
                      <span>•</span>
                      <span>{spin.selected_projects.length} options</span>
                    </div>
                  </div>
                  
                  {/* Link to project (if it still exists) */}
                  <div className="flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-auto p-1"
                    >
                      <Link
                        to={`/projects/${spin.project}`}
                        onClick={() => {
                          logger.debug('Project link clicked from history', {
                            projectId: spin.project,
                            projectTitle: spin.project_title,
                          });
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Footer note */}
      {history.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing last {Math.min(history.length, 10)} spins
        </p>
      )}
    </div>
  );
};