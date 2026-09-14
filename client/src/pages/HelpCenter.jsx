import { Link } from "react-router-dom";

const topics = [
  {
    title: "Getting started",
    items: [
      "Create a free customer account from the Register page.",
      "Browse products on Home or Shop and use filters to find what you need.",
      "Add items to your cart or wishlist while logged in.",
    ],
  },
  {
    title: "Orders & payments",
    items: [
      "Go to Cart → Checkout to place an order.",
      "Track orders from the Orders page in your account.",
      "Payment methods available are shown at checkout.",
    ],
  },
  {
    title: "Vendors",
    items: [
      "Vendor accounts are created by our admin team.",
      "Approved vendors can list products and manage orders from their dashboard.",
      "Customers can message vendors about a product via the chat feature.",
    ],
  },
  {
    title: "Need more help?",
    items: [
      "Check Shipping Info, Returns, and FAQs in the footer.",
      "Contact us from the Contact page for personal support.",
    ],
  },
];

export default function HelpCenter() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Help Center</h1>
      <p className="text-muted-foreground mb-10 text-sm">
        Quick guides to help you use the Platform.
      </p>

      <div className="space-y-8">
        {topics.map((topic) => (
          <section key={topic.title}>
            <h2 className="text-xl font-semibold mb-3">{topic.title}</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              {topic.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm">
        Still stuck?{" "}
        <Link to="/contact" className="underline font-medium">
          Contact support
        </Link>
        .
      </p>
    </div>
  );
}