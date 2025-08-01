import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import { ExternalLink, Copy, Link, Check } from 'lucide-react';

interface RichUrlComponentProps {
  url: string;
  className?: string;
  showCopyButton?: boolean;
}

const RichUrlComponent: React.FC<RichUrlComponentProps> = ({
  url,
  className = '',
  showCopyButton = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  // Parse and clean URL
  const parseUrl = (inputUrl: string) => {
    try {
      // Add protocol if missing
      const urlWithProtocol = inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`;

      const urlObj = new URL(urlWithProtocol);
      const domain = urlObj.hostname;
      const displayUrl = domain.replace(/^www\./, '');

      return {
        fullUrl: urlWithProtocol,
        domain,
        displayUrl,
        isValid: true,
      };
    } catch {
      return {
        fullUrl: url,
        domain: '',
        displayUrl: url,
        isValid: false,
      };
    }
  };

  // Generate site name from domain
  const generateSiteName = (domain: string) => {
    if (!domain) return '';

    // Remove common TLDs and split by dots
    const parts = domain.replace(/\.(com|net|org|co\.uk|co|io|app)$/, '').split('.');

    // Take the main domain part (last part before TLD)
    const mainPart = parts[parts.length - 1];

    // Convert to title case
    return mainPart
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Copy URL to clipboard
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(parsedUrl.fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error('Failed to copy URL:', error);
    }
  };

  // Open URL in new tab
  const handleClick = () => {
    if (parsedUrl.isValid) {
      window.open(parsedUrl.fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const parsedUrl = parseUrl(url);
  const siteName = generateSiteName(parsedUrl.domain);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${parsedUrl.domain}&sz=16`;

  if (!url.trim()) {
    return null;
  }

  return (
    <div className={`group relative ${className}`}>
      <div
        onClick={handleClick}
        className={`flex items-start gap-3 rounded-lg border border-border p-3 transition-all duration-200 hover:border-accent/20 hover:bg-muted/50 ${parsedUrl.isValid ? 'cursor-pointer' : 'cursor-default'} `}
      >
        {/* Favicon or fallback icon */}
        <div className="mt-0.5 flex-shrink-0">
          {parsedUrl.isValid && !faviconError ? (
            <img
              src={faviconUrl}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <Link className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* URL and site info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {parsedUrl.displayUrl}
            </span>
            {parsedUrl.isValid && (
              <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            )}
          </div>
          {siteName && <div className="mt-0.5 text-xs text-muted-foreground">{siteName}</div>}
          {!parsedUrl.isValid && (
            <div className="mt-0.5 text-xs text-destructive">Invalid URL format</div>
          )}
        </div>

        {/* Copy button */}
        {showCopyButton && parsedUrl.isValid && (
          <button
            onClick={handleCopy}
            className="flex-shrink-0 rounded p-1 opacity-0 transition-all duration-200 hover:bg-muted group-hover:opacity-100"
            title="Copy URL"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default RichUrlComponent;
