import MainLayout from '@/components/layout/MainLayout';
import { Heart } from 'lucide-react';

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

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-800/70 dark:bg-amber-900/30">
          <div className="flex items-start gap-3">
            <Heart className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-100">
                <span className="font-semibold text-amber-900 dark:text-amber-50">
                  A labor of love:
                </span>{' '}
                This app is maintained by one person who is learning as she goes, and is free of
                charge to use. Please be understanding when reporting bugs or looking for features
                to be added. Some changes may take awhile depending on complexity and my time.
              </p>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default About;
