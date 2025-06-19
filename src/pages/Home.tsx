import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';

const Home = () => {
  // Set SEO meta information for the home page
  useEffect(() => {
    document.title = 'Organized Glitter - Manage Your Diamond Art Collection';

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'The ultimate digital companion for diamond painting enthusiasts. Organize your stash, track progress, manage your wishlist, and keep detailed notes for all your diamond art projects.'
      );
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content =
        'The ultimate digital companion for diamond painting enthusiasts. Organize your stash, track progress, manage your wishlist, and keep detailed notes for all your diamond art projects.';
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <MainLayout>
      <div className="diamond-pattern">
        {/* Hero Section */}
        <section className="px-4 py-16 md:py-24">
          <div className="container mx-auto">
            <div className="flex flex-col items-center text-center">
              <h1 className="mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
                <span className="bg-gradient-to-r from-primary via-mauve-500 to-flamingo-400 bg-clip-text text-transparent">
                  Organize Your Diamond Art Collection
                </span>
              </h1>
              <p className="mb-8 max-w-2xl text-xl text-foreground/80 md:text-2xl">
                Manage your stash, track your projects, and keep track of your wishlist - all in one
                place.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/register">
                  <Button size="lg" className="bg-primary text-base shadow-md hover:bg-diamond-600">
                    Get Started for Free
                  </Button>
                </Link>
                <Link to="/about">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-primary text-base text-primary hover:bg-mauve-100"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-white/80 py-16 backdrop-blur-sm dark:bg-zinc-900/80">
          <div className="container mx-auto px-4">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">
                All Your Diamond Painting Notes in One Place
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Organized Glitter makes it easy to organize, track, and remember your diamond
                painting journey.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {/* Feature 1 */}
              <div className="rounded-lg border border-border bg-white p-6 shadow-md dark:bg-background">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-mauve-100 text-mauve-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-semibold">Project Management</h3>
                <p className="text-muted-foreground">
                  Track every detail of your diamond paintings from wishlist to completion.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-lg border border-border bg-white p-6 shadow-md dark:bg-background">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-flamingo-100 text-flamingo-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-semibold">Progress Notes</h3>
                <p className="text-muted-foreground">
                  Upload photos and add notes to journal your progress from start to finish.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-lg border border-border bg-white p-6 shadow-md dark:bg-background">
                {/* Accent 1 (light cyan) */}
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-peach-100 text-peach-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                    />
                  </svg>
                </div>
                {/* Button/CTA - Alternative color option */}
                {/*
                  <div className="h-12 w-12 flex items-center justify-center rounded-full bg-diamond-100 text-diamond-700 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                  </div>
                  */}
                <h3 className="mb-2 text-xl font-semibold">Customized For You</h3>
                <p className="text-muted-foreground">
                  Create your own lists of companies, artists, and your favorite diamond art.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};
export default Home;
