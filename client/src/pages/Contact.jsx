import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [sent, setSent] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: wire to backend / email service later
    setSent(true);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Contact Us</h1>
      <p className="text-muted-foreground mb-8 text-sm">
        Have a question or need help? Send us a message and we’ll get back to
        you as soon as possible.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Send a message</CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-success">
              Thank you! Your message has been received. We’ll respond soon.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  required
                  value={form.subject}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={handleChange}
                />
              </div>
              <Button type="submit" className="w-full">
                Send message
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 text-sm text-muted-foreground space-y-1">
        <p>
          <strong className="text-foreground">Email:</strong> support@yourcompany.com
        </p>
        <p>
          <strong className="text-foreground">Hours:</strong> Sunday – Friday,
          10:00 AM – 6:00 PM
        </p>
      </div>
    </div>
  );
}