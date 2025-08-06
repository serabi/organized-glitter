import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-background dark:bg-background">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-lg font-semibold">Organized Glitter</h3>
            <p className="text-muted-foreground">
              Organize, track, and celebrate your diamond painting journey.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted-foreground transition-colors hover:text-accent">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/changelog"
                  className="text-muted-foreground transition-colors hover:text-accent"
                >
                  Changelog
                </Link>
              </li>
              <li>
                <Link
                  to="/links"
                  className="text-muted-foreground transition-colors hover:text-accent"
                >
                  Social Media
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Connect</h3>
            <ul className="space-y-4">
              <li>
                <Link
                  to="/about"
                  className="text-muted-foreground transition-colors hover:text-accent"
                >
                  About
                </Link>
              </li>
              <li>
                <a
                  href="mailto:contact@organizedglitter.app"
                  className="text-muted-foreground transition-colors hover:text-accent"
                >
                  Email Me
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between border-t border-border pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Organized Glitter. All rights reserved.
          </p>
          <div className="mt-4 flex space-x-4 md:mt-0">
            <Link
              to="/privacy"
              className="text-sm text-muted-foreground transition-colors hover:text-accent"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-sm text-muted-foreground transition-colors hover:text-accent"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
