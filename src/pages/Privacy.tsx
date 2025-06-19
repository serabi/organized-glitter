import MainLayout from '@/components/layout/MainLayout';

const Privacy = () => (
  <MainLayout>
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-bold">Privacy Policy</h1>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">1. Information We Collect</h2>
        <p className="mb-4 text-foreground/90">
          At Organized Glitter, we respect your privacy. We only collect the following information:
        </p>
        <ul className="mb-4 list-disc space-y-2 pl-6">
          <li>Your email address for account creation and communication</li>
          <li>Your username to personalize your experience</li>
          <li>Any information you add about your diamond art kits, including any progress notes</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">2. How We Use Your Information</h2>
        <p className="mb-4 text-foreground/90">
          Your data is used solely to provide you with this service. We do not sell or share your
          personal information with third parties except as described in this policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">3. Data Security</h2>
        <p className="mb-4 text-foreground/90">
          We take the security of your data seriously. Your information is stored securely and is
          only accessible to the owner of this site. We implement appropriate technical and
          organizational measures to protect your personal data.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">4. Your Rights</h2>
        <p className="mb-4 text-foreground/90">You have full control over your data. You can:</p>
        <ul className="mb-4 list-disc space-y-2 pl-6">
          <li>Access your personal information at any time through your account settings</li>
          <li>Update or correct your information</li>
          <li>Export your data via CSV</li>
          <li>Request deletion of your account and all associated data at any time</li>
        </ul>
        <p className="text-foreground/90">
          To delete your account, please visit your account settings or contact us at
          contact@organizedglitter.app.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">5. Third-Party Services</h2>
        <h3 className="mb-2 text-xl font-medium">Vercel Analytics</h3>
        <p className="mb-4 text-foreground/90">
          We use Vercel Analytics to collect anonymous usage data about how our website is used.
          This includes page views, user interactions, and performance metrics. This data helps us
          improve the user experience and understand how to make Organized Glitter better. All data
          collected is anonymous and is not shared with any other third parties. Vercel Analytics is
          GDPR and CCPA compliant and does not use cookies or track personal information.
        </p>
        <h3 className="mb-2 text-xl font-medium">Error Tracking</h3>
        <p className="mb-4 text-foreground/90">
          We collect information about issues and errors that occur on the site to help us identify
          and fix problems to improve the reliability and performance of Organized Glitter. We
          collect technical information about errors (such as error messages and stack traces) but
          do not intentionally collect personal information.
        </p>
        <p className="mb-4 text-foreground/90">
          <strong>Technical data collected may include:</strong> IP addresses, browser information,
          and error details. In rare cases, error reports could potentially contain personal data if
          such information appears in error messages. All error tracking data is stored on our own
          servers and is not shared with third parties. This information is used solely for
          debugging and improving the service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">6. Intellectual Property</h2>
        <p className="mb-4 text-foreground/90">
          All company names, artist names, and diamond kit names mentioned on this site are
          trademarks of their respective owners. We do not claim any ownership rights to these
          trademarks. Organized Glitter also does not claim any ownership or affiliation with these
          entities unless otherwise stated.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">7. Changes to This Policy</h2>
        <p className="text-foreground/90">
          We may update our Privacy Policy from time to time. We will notify you of any changes by
          posting the new Privacy Policy on this page and updating the "Last updated" date below.
        </p>
        <p className="mt-4 text-foreground/80">
          <em>Last updated: May 25, 2025</em>
        </p>
      </section>
    </div>
  </MainLayout>
);

export default Privacy;
