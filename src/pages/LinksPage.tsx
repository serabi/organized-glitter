/**
 * Links page - A link-in-bio style page for social media sharing
 * @author @serabi
 * @created 2025-01-24
 */

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Heart, Sparkles, Camera } from 'lucide-react';
import { createLogger } from '@/utils/logger';

const logger = createLogger('LinksPage');

// Configuration for easy updates
const profileConfig = {
  name: 'Sarah | Organized Glitter',
  bio: 'Helping crafters organize and track their diamond painting projects',
  avatar: '/images/logo.png',
  social: {
    instagram: 'https://www.instagram.com/organized_glitter',
  },
};

const primaryLinks = [
  {
    title: 'Try Organized Glitter',
    description: 'Track your diamond painting projects with ease',
    url: 'https://organizedglitter.app',
    variant: 'default' as const,
    icon: Sparkles,
    featured: true,
  },
];

const thingsIveTalkedAbout = [
  {
    title: 'Cozy Reading by Simone Grünewald (ArtDot)',
    url: 'https://www.artdot.com/products/cozy-reading-pastoral-diamond-painting-kit',
  },
];

const affiliateLinks = [
  {
    title:
      "Check out ArtDot's new kits - and use my affiliate link to get $10 off your first order!",
    brand: 'ArtDot',
    url: 'https://www.artdot.com?loloyal_referral_code=G7BvKA9xR9rJ&utm_source=loloyal&utm_medium=referral&utm_campaign=loloyal_referrals',
    featured: true,
  },
  {
    title:
      'Use `PAR-F6NP7SF` to get 5% off your first order! Great source for the Disney mystery coloring books.',
    brand: 'Lireka',
    url: 'https://www.lireka.com/en',
    featured: true,
  },
];

/**
 * Links page component - Link-in-bio style landing page
 */
const LinksPage: React.FC = () => {
  // Set SEO meta information for the links page
  React.useEffect(() => {
    document.title = 'Sarah | Organized Glitter - Links';

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Diamond Painting Project Manager helping crafters organize & track their sparkling creations. Free app for managing your diamond painting stash and projects.'
      );
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content =
        'Diamond Painting Project Manager helping crafters organize & track their sparkling creations. Free app for managing your diamond painting stash and projects.';
      document.head.appendChild(meta);
    }
  }, []);
  const handleLinkClick = (url: string, title: string) => {
    logger.info('Link clicked from bio page', { url, title });

    if (url.startsWith('http') || url.startsWith('#')) {
      if (url !== '#') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } else {
      window.location.href = url;
    }
  };

  const handleSocialClick = (platform: string, url: string) => {
    logger.info('Social link clicked', { platform, url });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <MainLayout hideNav hideFooter>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto max-w-md px-4 py-8">
          {/* Profile Section */}
          <Card className="mb-6 text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profileConfig.avatar} alt={profileConfig.name} />
                  <AvatarFallback className="text-2xl">
                    <Sparkles className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <h1 className="text-xl font-bold">{profileConfig.name}</h1>
              <p className="text-sm italic leading-relaxed text-muted-foreground">
                {profileConfig.bio}
              </p>
            </CardHeader>
          </Card>

          {/* Primary Action Links */}
          <div className="mb-6 space-y-3">
            {primaryLinks.map((link, index) => (
              <Card
                key={index}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  link.featured ? 'ring-2 ring-primary/20' : ''
                }`}
                onClick={() => handleLinkClick(link.url, link.title)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {link.icon && <link.icon className="h-5 w-5 text-primary" />}
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{link.title}</div>
                      <p className="text-sm text-muted-foreground">{link.description}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator className="my-6" />

          {/* Things I've Talked About */}
          <div className="space-y-3">
            <h2 className="text-center text-sm font-medium text-muted-foreground">
              Things I've Talked About
            </h2>
            {thingsIveTalkedAbout.map((item, index) => (
              <Card
                key={index}
                className="cursor-pointer border-pink-200/40 transition-all hover:scale-[1.01] hover:shadow-md dark:border-pink-800/10"
                onClick={() => handleLinkClick(item.url, item.title)}
                style={{
                  background:
                    'linear-gradient(135deg, rgba(252, 231, 243, 0.4) 0%, rgba(237, 233, 254, 0.4) 50%, rgba(219, 234, 254, 0.4) 100%)',
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium leading-relaxed text-foreground">
                        {item.title}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-purple-300" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator className="my-6" />

          {/* Affiliate Links */}
          <div className="space-y-3">
            <h2 className="text-center text-sm font-medium text-muted-foreground">
              Affiliate Links
            </h2>
            {affiliateLinks.map((link, index) => (
              <Card
                key={index}
                className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${
                  link.featured ? 'border-pink-200/40 dark:border-pink-800/10' : ''
                }`}
                onClick={() => handleLinkClick(link.url, link.title)}
                style={
                  link.featured
                    ? {
                        background:
                          'linear-gradient(135deg, rgba(252, 231, 243, 0.4) 0%, rgba(237, 233, 254, 0.4) 50%, rgba(219, 234, 254, 0.4) 100%)',
                      }
                    : {}
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-left">
                      <div className="mb-2">
                        <span className="text-lg font-bold text-pink-600 dark:text-pink-200">
                          {link.brand}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">{link.title}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <ExternalLink className="h-4 w-4 text-purple-300" />
                      <span className="text-xs font-medium text-purple-300">Shop Now</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Instagram Link */}
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSocialClick('Instagram', profileConfig.social.instagram)}
              className="gap-2 rounded-full"
            >
              <Camera className="h-4 w-4" />
              Follow on Instagram
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              Made with <Heart className="inline h-3 w-3 text-red-500" /> for diamond painting
              enthusiasts
            </p>
            <p className="mt-1 text-xs text-muted-foreground">© 2025 Organized Glitter</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default LinksPage;
