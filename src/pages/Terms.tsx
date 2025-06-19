import MainLayout from '@/components/layout/MainLayout';

const Terms = () => (
  <MainLayout>
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-bold">Terms of Service</h1>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">1. Acceptance of Terms</h2>
        <p className="mb-4 text-foreground/90">
          By accessing and using Organized Glitter ("the Service"), you accept and agree to be bound
          by the terms and provision of this agreement. If you do not agree to abide by the above,
          please do not use this service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">2. Description of Service</h2>
        <p className="mb-4 text-foreground/90">
          Organized Glitter is a web-based application that helps users organize and track their
          diamond art (diamond painting) projects. The Service allows you to:
        </p>
        <ul className="mb-4 list-disc space-y-2 pl-6">
          <li>Create and manage a digital inventory of your diamond art kits</li>
          <li>Track progress on individual projects</li>
          <li>Add notes, photos, and other project details</li>
          <li>Export your text based data via CSV (photo exports coming later)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">3. Free Service</h2>
        <p className="mb-4 text-foreground/90">
          Organized Glitter is currently provided free of charge. There are no subscription fees or
          payment requirements associated with using the Service at this time. We have no plans to
          monetize the site at this point in time. We do accept donations towards hosting expenses
          via PayPal, but all money donated here goes directly back to the cost of hosting the site.
          No profit is being made off of Organized Glitter.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">4. User Accounts</h2>
        <p className="mb-4 text-foreground/90">
          To use certain features of the Service, you must create an account. You are responsible
          for:
        </p>
        <ul className="mb-4 list-disc space-y-2 pl-6">
          <li>Maintaining the confidentiality of your account credentials</li>
          <li>All activities that occur under your account</li>
          <li>Notifying us immediately of any unauthorized use of your account</li>
          <li>Providing accurate information when creating your account</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">5. User Content</h2>
        <p className="mb-4 text-foreground/90">
          You retain ownership of any content you upload to the Service, including photos, notes,
          and project information. By using the Service, you grant us a limited license to store and
          display your content solely for the purpose of providing the Service to you.
        </p>
        <p className="mb-4 text-foreground/90">
          You are responsible for ensuring that any content you upload does not violate any
          third-party rights or applicable laws.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">6. Intellectual Property</h2>
        <p className="mb-4 text-foreground/90">
          All company names, artist names, kit names, and brand names referenced in the Service are
          trademarks of their respective owners. We do not claim ownership of these trademarks and
          reference them solely for organizational purposes.
        </p>
        <p className="mb-4 text-foreground/90">
          The Organized Glitter application, including its design, code, and functionality, is owned
          by us and protected by copyright and other intellectual property laws.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">7. Prohibited Uses</h2>
        <p className="mb-4 text-foreground/90">You agree not to use the Service to:</p>
        <ul className="mb-4 list-disc space-y-2 pl-6">
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe upon the rights of others</li>
          <li>Upload malicious code or attempt to compromise the Service</li>
          <li>Use automated systems to access the Service without permission</li>
          <li>Share your account credentials with others</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">8. Service Availability</h2>
        <p className="mb-4 text-foreground/90">
          We strive to maintain the Service's availability but do not guarantee uninterrupted
          access. The Service may be temporarily unavailable due to maintenance, updates, or
          circumstances beyond our control.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">9. Data and Privacy</h2>
        <p className="mb-4 text-foreground/90">
          Your use of the Service is also governed by our Privacy Policy, which can be found at{' '}
          <a href="/privacy" className="text-primary hover:underline">
            organizedglitter.app/privacy
          </a>
          . The Privacy Policy is incorporated into these Terms by reference.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">10. Termination</h2>
        <p className="mb-4 text-foreground/90">
          You may terminate your account at any time through your account settings. We may terminate
          or suspend access to the Service immediately, without prior notice, if you breach these
          Terms.
        </p>
        <p className="mb-4 text-foreground/90">
          Upon termination, your right to use the Service will cease immediately, and we may delete
          your account and associated data.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">11. Disclaimer of Warranties</h2>
        <p className="mb-4 text-foreground/90">
          The Service is provided "as is" without warranties of any kind, either express or implied.
          We use Supabase as our database and storage provider and pull regular backups of data.
          While we have made reasonable attempts to protect your data, we do not warrant that the
          Service will be uninterrupted, error-free, or completely secure.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">12. Limitation of Liability</h2>
        <p className="mb-4 text-foreground/90">
          In no event shall Organized Glitter be liable for any indirect, incidental, special,
          consequential, or punitive damages arising out of your use of the Service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">13. Changes to Terms</h2>
        <p className="mb-4 text-foreground/90">
          We reserve the right to modify these Terms at any time. We will notify users of any
          material changes by posting the updated Terms on this page and updating the "Last updated"
          date below.
        </p>
        <p className="mb-4 text-foreground/90">
          Your continued use of the Service after changes are posted constitutes acceptance of the
          updated Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">14. Contact Information</h2>
        <p className="mb-4 text-foreground/90">
          If you have any questions about these Terms of Service, please contact us at{' '}
          <a href="mailto:contact@organizedglitter.app" className="text-primary hover:underline">
            contact@organizedglitter.app
          </a>
          .
        </p>
      </section>

      <section>
        <p className="mt-8 text-foreground/80">
          <em>Last updated: June 17, 2025</em>
        </p>
      </section>
    </div>
  </MainLayout>
);

export default Terms;
