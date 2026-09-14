export default function Shipping() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Shipping Info</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Delivery options and what to expect.
      </p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-3">Processing time</h2>
          <p>
            Vendors typically process orders within 1–3 business days after
            payment confirmation. You’ll receive updates when the order status
            changes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Delivery time</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Within major cities:</strong> usually 2–5 business days
              after dispatch.
            </li>
            <li>
              <strong>Other areas:</strong> 5–10 business days depending on
              location and courier.
            </li>
          </ul>
          <p className="mt-2">
            These are estimates only. Actual times can vary due to weather,
            holidays, or courier delays.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Shipping costs</h2>
          <p>
            Shipping fees (if any) are calculated at checkout based on location
            and order details. Some vendors may offer free shipping above a
            certain order value.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Tracking</h2>
          <p>
            When available, tracking information will appear on your order
            detail page. You can also message the vendor for updates.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Failed delivery</h2>
          <p>
            Please ensure your address and phone number are correct. If
            delivery fails due to incorrect details or repeated failed attempts,
            extra charges or order cancellation may apply.
          </p>
        </section>
      </div>
    </div>
  );
}