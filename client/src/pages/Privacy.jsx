export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated: September 14, 2026
      </p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
          <p>
            This Privacy Policy explains how we collect, use, store, and protect
            your personal information when you use our multi-vendor marketplace
            Platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Account data:</strong> name, email, password (hashed), and
              role (customer, vendor, admin).
            </li>
            <li>
              <strong>Order data:</strong> shipping address, phone, order
              history, and payment-related information processed by our payment
              providers.
            </li>
            <li>
              <strong>Vendor data:</strong> store name, description, logo,
              banner, and contact phone.
            </li>
            <li>
              <strong>Usage data:</strong> pages visited, device/browser type,
              IP address, and approximate location.
            </li>
            <li>
              <strong>Communications:</strong> messages sent through chat,
              reviews, and support requests.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>To create and manage your account</li>
            <li>To process and fulfill orders</li>
            <li>To enable chat between customers and vendors</li>
            <li>To show relevant products and improve the Platform</li>
            <li>To send order updates and important service notices</li>
            <li>To prevent fraud and enforce our Terms</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Sharing of Information</h2>
          <p>We may share information with:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              <strong>Vendors:</strong> necessary order and shipping details so
              they can fulfill your purchase.
            </li>
            <li>
              <strong>Service providers:</strong> hosting, payment gateways,
              email, and analytics partners who process data on our behalf.
            </li>
            <li>
              <strong>Legal authorities:</strong> when required by law or to
              protect rights and safety.
            </li>
          </ul>
          <p className="mt-2">
            We do not sell your personal information to third parties for
            marketing.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Cookies & Similar Technologies</h2>
          <p>
            We use cookies and similar technologies to keep you logged in,
            remember preferences, and understand how the Platform is used. You
            can control cookies through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Data Security</h2>
          <p>
            We use industry-standard measures (encryption in transit, hashed
            passwords, access controls) to protect your data. No method of
            transmission or storage is 100% secure, so we cannot guarantee
            absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
          <p>
            We keep your information for as long as your account is active or
            as needed to provide services, resolve disputes, and meet legal
            requirements. You may request deletion of your account subject to
            our retention obligations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Your Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to or restrict certain processing</li>
            <li>Withdraw consent where processing is based on consent</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact us using the details in the
            Contact section.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Children’s Privacy</h2>
          <p>
            The Platform is not intended for children under 18. We do not
            knowingly collect personal information from children.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The “Last
            updated” date will reflect the latest version. Continued use of
            the Platform means you accept the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">11. Contact</h2>
          <p>
            For privacy-related questions or requests, please contact us
            through the Contact page or the support email listed on the
            Platform.
          </p>
        </section>
      </div>
    </div>
  );
}