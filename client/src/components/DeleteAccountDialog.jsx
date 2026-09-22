import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";

/**
 * Self-service "delete my account" control.
 *
 * Users can delete their own account whenever they want — this just makes
 * them re-enter their password first so a hijacked/left-open session can't
 * wipe the account without warning. Renders as a small danger-zone card;
 * drop it into any account/settings page.
 */
export default function DeleteAccountDialog({
  description = "This permanently deletes your account and your saved data. This can't be undone.",
}) {
  const { deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const resetAndClose = () => {
    setPassword("");
    setError("");
    setDeleting(false);
    setOpen(false);
  };

  const handleDelete = async () => {
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await deleteAccount(password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
      <h2 className="text-lg font-semibold text-destructive">Danger zone</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetAndClose();
        }}
      >
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" className="mt-4">
            Delete my account
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This is permanent and can't be undone. Enter your password to
              confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4 space-y-2">
            <Label htmlFor="delete-account-password">Password</Label>
            <Input
              id="delete-account-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleDelete();
                }
              }}
              autoFocus
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(e) => {
                // Radix closes the dialog on click by default; keep it open
                // until we know whether deletion actually succeeded.
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
