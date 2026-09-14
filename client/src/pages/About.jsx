export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight mb-6">About Us</h1>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p className="text-base text-foreground">
          Welcome to our multi-vendor marketplace — a place where trusted
          local and online vendors can sell quality products, and customers
          can discover them in one convenient Platform.
        </p>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Our Mission
          </h2>
          <p>
            We aim to make online shopping simple, fair, and accessible. We
            connect customers with independent sellers while providing tools
            for vendors to grow their business.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            What We Offer
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>A wide range of products from approved vendors</li>
            <li>Secure accounts and order tracking</li>
            <li>Direct chat between customers and vendors</li>
            <li>Wishlist, reviews, and easy checkout</li>
            <li>Admin-managed vendor approvals for quality control</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            For Vendors
          </h2>
          <p>
            Vendor accounts are created by our admin team. Once approved, you
            can list products, manage stock, handle orders, and communicate
            with customers — all from your vendor dashboard.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            For Customers
          </h2>
          <p>
            Browse products, add them to your cart or wishlist, place orders,
            leave reviews, and message vendors when you need help. Your
            satisfaction is important to us.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Get in Touch
          </h2>
          <p>
            Have questions or feedback? Visit our{" "}
            <a href="/contact" className="underline text-foreground">
              Contact
            </a>{" "}
            page — we’d love to hear from you.
          </p>
        </section>
      </div>
    </div>
  );
}