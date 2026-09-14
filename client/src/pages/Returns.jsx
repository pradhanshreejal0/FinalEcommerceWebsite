export default function Returns() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Returns & Refunds
      </h1>
      <p className="text-sm text-muted-foreground mb-10">
        How returns and refunds work on our Platform.
      </p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-3">Return window</h2>
          <p>
            Most items can be returned within <strong>7 days</strong> of
            delivery, provided they are unused, in original packaging, and
            with all tags/accessories included. Some products (e.g. personal
            care, perishable, or custom items) may be non-returnable — this
            will be noted on the product page when applicable.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">How to request a return</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Go to your Orders page and open the order.</li>
            <li>Select the item and choose “Request return” (or contact support / the vendor via chat).</li>
            <li>Wait for approval and follow the return shipping instructions.</li>
            <li>Ship the item back in a secure package.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Refunds</h2>
          <p>
            Once the returned item is received and inspected, approved refunds
            are processed to your original payment method. This usually takes
            5–10 business days depending on your bank or payment provider.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Damaged or wrong items</h2>
          <p>
            If you received a damaged, defective, or incorrect product, contact
            us or the vendor as soon as possible with photos. We will help
            arrange a replacement or refund according to the case.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Vendor-specific policies</h2>
          <p>
            Because this is a multi-vendor marketplace, some vendors may have
            additional return rules. Always check the product page and vendor
            information before buying.
          </p>
        </section>
      </div>
    </div>
  );
}