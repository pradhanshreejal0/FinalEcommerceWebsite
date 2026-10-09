import { useState } from "react";
import { SiFacebook, SiX, SiInstagram } from "@icons-pack/react-simple-icons";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";

function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ loading: false, message: "", error: false });

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;

    setStatus({ loading: true, message: "", error: false });
    try {
      const res = await api.post("/newsletter/subscribe", { email });
      setStatus({ loading: false, message: res.message || "Subscribed successfully!", error: false });
      setEmail("");
    } catch (err) {
      setStatus({ loading: false, message: err.message || "Subscription failed.", error: true });
    }
  };

  return (
    <footer className="bg-secondary text-secondary-foreground pt-8 pb-4 border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Foundry</h3>
            <p className="text-sm mb-4 text-muted-foreground">
              Everyday, elevated. Considered finds for the way you live, work,
              move and make a home.
            </p>
            <div className="flex space-x-4 mt-2">
              <a
                href="#"
                aria-label="Facebook"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <SiFacebook size={20} />
              </a>
              <a
                href="#"
                aria-label="Twitter/X"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <SiX size={20} />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <SiInstagram size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/products"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Shop
                </Link>
              </li>
              <li>
                <Link
                  target="_blank"
                  to="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  target="_blank"
                  to="/contact"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  target="_blank"
                  to="/help"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  target="_blank"
                  to="/returns"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Returns
                </Link>
              </li>
              <li>
                <Link
                  target="_blank"
                  to="/shipping"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link
                  target="_blank"
                  to="/faq"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  FAQs
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Sign-up */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Subscribe</h3>
            <form
              onSubmit={handleSubscribe}
              className="flex flex-col gap-2"
            >
              <div className="flex sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="min-w-0 flex-1 bg-background"
                />
                <Button type="submit" className="shrink-0" disabled={status.loading}>
                  {status.loading ? "..." : "Subscribe"}
                </Button>
              </div>
              {status.message && (
                <p className={`text-xs mt-1 ${status.error ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                  {status.message}
                </p>
              )}
            </form>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between text-sm gap-2">
          <p className="text-muted-foreground">
            &copy; {new Date().getFullYear()} Foundry. All rights reserved.
          </p>
          <div className="space-x-4">
            <Link
              target="_blank"
              to="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              target="_blank"
              to="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
