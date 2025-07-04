import MainLayout from '@/components/layout/MainLayout';
import { MessageCircle, ExternalLink, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { showUserReportDialog } from '@/components/FeedbackDialogStore';

const About = () => {
  return (
    <MainLayout>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">About Organized Glitter</h1>

        <section className="mb-12 rounded-lg border border-border/50 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-border/30 dark:bg-[#1a1a1a]">
          <div className="flex flex-col items-center gap-6 md:flex-row">
            <div className="flex flex-col items-center md:w-1/3 lg:w-1/4">
              <img
                src="/images/chibi-wave.png"
                alt="Chibi version of Sarah waving"
                className="h-auto w-48 rounded-lg shadow-md transition-shadow hover:shadow-lg"
              />
            </div>
            <div className="md:w-2/3 lg:w-3/4">
              <p className="mb-4 leading-relaxed text-foreground/90">
                Hi! I'm Sarah, also known as Serabi Crafts. Organized Glitter is a web application
                that I created to help fellow diamond artists track their stash and wish lists. When
                I started diamond painting, I immediately discovered that I really enjoy the hobby -
                but I struggled to find a way to track my stash and wish lists that worked for me.
                After trying a variety of options, I decided to try to build my own...which has led
                to Organized Glitter.
              </p>
              <p className="leading-relaxed text-foreground/90">
                This website has been so fun for me to make, and I'm excited to share it with my
                fellow diamond art lovers. Whether you're looking for an easy way to track your
                current works in progress, manage your stash, or plan your future projects, my hope
                is that this app will make it easier for you to do that.
              </p>
              <p className="mt-8 text-center text-xs italic text-foreground/70 md:text-left">
                Chibi of me created by the amazingly talented{' '}
                <a
                  href="https://www.youtube.com/@DPandDP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
                >
                  Diamond Painting and Dr. Pepper
                </a>{' '}
                - thank you!
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border/50 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-border/30 dark:bg-[#1a1a1a]">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold">
            <MessageCircle className="h-6 w-6" />
            Get in Touch
          </h2>

          <div className="space-y-6">
            <p className="leading-relaxed text-foreground/90">
              I'd love to hear from you about your experience with Organized Glitter, if you have
              feature suggestions, or even just to connect with other diamond painters!
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Feedback Button */}
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    Send Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Use the built-in feedback system to share thoughts or report bugs.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      showUserReportDialog({
                        title: 'Share Your Feedback',
                        subtitle:
                          "Tell me about your experience with Organized Glitter, suggest features, or report any issues you've encountered.",
                        currentPage: 'About Page',
                      });
                    }}
                    className="w-full"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Send A Message
                  </Button>
                </CardContent>
              </Card>

              {/* Feature Requests */}
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ExternalLink className="h-5 w-5 text-primary" />
                    Feature Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Vote on upcoming features and submit detailed feature requests.
                  </p>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <a
                      href="https://organizedglitter.featurebase.app"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Visit Featurebase
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-800/70 dark:bg-amber-900/30">
              <div className="flex items-start gap-3">
                <Heart className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-100">
                    <span className="font-semibold text-amber-900 dark:text-amber-50">
                      A labor of love:
                    </span>{' '}
                    This app is maintained by one person who is learning as she goes, and is free of
                    charge to use. Please be understanding when reporting bugs or looking for
                    features to be added. Some changes may take awhile depending on complexity and
                    my time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default About;
