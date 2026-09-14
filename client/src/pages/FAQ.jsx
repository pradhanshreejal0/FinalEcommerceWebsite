const faqs = [
  {
    q: "How do I create an account?",
    a: "Click Register, enter your name, email, and password. Accounts are customer accounts by default. Vendor accounts are created by admin.",
  },
  {
    q: "How do I become a vendor?",
    a: "Vendor registration is currently managed by our admin team. Contact support if you are interested in selling on the Platform.",
  },
  {
    q: "How can I track my order?",
    a: "Go to Orders in your account. Open the order to see its current status and any tracking details provided by the vendor.",
  },
  {
    q: "Can I cancel an order?",
    a: "You can request cancellation before the order is shipped. Contact the vendor via chat or use the Contact page as soon as possible.",
  },
  {
    q: "How do returns work?",
    a: "See our Returns page. Most items can be returned within 7 days if unused and in original condition. Some products may be non-returnable.",
  },
  {
    q: "Is my payment information safe?",
    a: "Payments are processed through secure payment providers. We do not store full card details on our servers.",
  },
  {
    q: "How do I contact a vendor?",
    a: "On a product page, use the chat / message option (when available) to talk directly with the vendor about that product.",
  },
  {
    q: "I forgot my password. What should I do?",
    a: "Use the login page options or contact support so we can help you regain access to your account.",
  },
];

export default function FAQ() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Frequently Asked Questions
      </h1>
      <p className="text-sm text-muted-foreground mb-10">
        Common questions about shopping and selling on our Platform.
      </p>

      <div className="space-y-6">
        {faqs.map((item) => (
          <div key={item.q} className="border-b pb-4">
            <h2 className="font-semibold mb-2">{item.q}</h2>
            <p className="text-sm text-muted-foreground">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}