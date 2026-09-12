import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/StarRating";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function ProductReviews({ productId }) {
  const { user, accessToken } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [eligibility, setEligibility] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editMessage, setEditMessage] = useState("");

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api(`/reviews/product/${productId}`);
      setReviews(data || []);
    } catch (err) {
      setError(err.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const loadEligibility = async () => {
    if (!user || user.role !== "customer" || !accessToken) {
      setEligibility(null);
      return;
    }
    try {
      const data = await api(`/reviews/eligibility/${productId}`, { accessToken });
      setEligibility(data);
    } catch {
      setEligibility(null);
    }
  };

  useEffect(() => {
    if (!productId) return;
    loadReviews();
    loadEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, user, accessToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1) {
      setFormMessage("Please select a star rating.");
      return;
    }

    setSubmitting(true);
    setFormMessage("");

    try {
      await api("/reviews", {
        method: "POST",
        accessToken,
        body: JSON.stringify({ productId, rating, comment }),
      });

      setRating(0);
      setComment("");
      setFormMessage("Review submitted. Thanks for your feedback!");
      await loadReviews();
      await loadEligibility();
    } catch (err) {
      setFormMessage(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId) => {
    try {
      await api(`/reviews/${reviewId}`, { method: "DELETE", accessToken });
      if (editingId === reviewId) setEditingId(null);
      await loadReviews();
      await loadEligibility();
    } catch (err) {
      setError(err.message || "Failed to delete review.");
    }
  };

  const startEdit = (review) => {
    setEditingId(review._id);
    setEditRating(review.rating);
    setEditComment(review.comment || "");
    setEditMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditMessage("");
  };

  const handleEditSubmit = async (e, reviewId) => {
    e.preventDefault();
    if (editRating < 1) {
      setEditMessage("Please select a star rating.");
      return;
    }

    setEditSubmitting(true);
    setEditMessage("");

    try {
      await api(`/reviews/${reviewId}`, {
        method: "PUT",
        accessToken,
        body: JSON.stringify({ rating: editRating, comment: editComment }),
      });

      setEditingId(null);
      await loadReviews();
      await loadEligibility();
    } catch (err) {
      setEditMessage(err.message || "Failed to update review.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const average =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

  return (
    <section className="mt-16 border-t pt-10">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Customer Reviews</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <StarRating value={Number(average)} readOnly size={16} />
            <span>
              {average} ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
            </span>
          </div>
        )}
      </div>

      {/* Review form */}
      {user && user.role === "customer" && (
        <div className="mt-6 rounded-lg border p-4">
          {eligibility?.canReview ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <p className="text-sm font-medium">Write a review</p>
              <StarRating value={rating} onChange={setRating} size={22} />
              <Textarea
                placeholder="Share your thoughts about this product..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Review"}
              </Button>
              {formMessage && (
                <p className="text-sm text-muted-foreground">{formMessage}</p>
              )}
            </form>
          ) : eligibility?.reason === "already_reviewed" ? (
            <p className="text-sm text-muted-foreground">
              You've already reviewed this product.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              You can review this product after it's been delivered to you.
            </p>
          )}
        </div>
      )}

      {/* Review list */}
      <div className="mt-8 space-y-6">
        {loading && (
          <p className="text-sm text-muted-foreground">Loading reviews...</p>
        )}

        {!loading && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && reviews.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No reviews yet. Be the first to review this product!
          </p>
        )}

        {!loading &&
          reviews.map((review, i) => (
            <div key={review._id}>
              {i > 0 && <Separator className="mb-6" />}
              <div className="flex gap-3">
                <Avatar>
                  <AvatarFallback>
                    {review.user?.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{review.user?.name || "Anonymous"}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {editingId === review._id ? (
                    <form
                      onSubmit={(e) => handleEditSubmit(e, review._id)}
                      className="mt-2 space-y-3"
                    >
                      <StarRating value={editRating} onChange={setEditRating} size={20} />
                      <Textarea
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        rows={3}
                      />
                      <div className="flex items-center gap-2">
                        <Button type="submit" size="sm" disabled={editSubmitting}>
                          {editSubmitting ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                      {editMessage && (
                        <p className="text-sm text-muted-foreground">{editMessage}</p>
                      )}
                    </form>
                  ) : (
                    <>
                      <StarRating value={review.rating} readOnly size={14} className="mt-1" />
                      {review.comment && (
                        <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3">
                        {user?._id === review.user?._id && (
                          <button
                            onClick={() => startEdit(review)}
                            className="text-xs text-muted-foreground underline"
                          >
                            Edit
                          </button>
                        )}
                        {(user?._id === review.user?._id || user?.role === "admin") && (
                          <button
                            onClick={() => handleDelete(review._id)}
                            className="text-xs text-destructive underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}