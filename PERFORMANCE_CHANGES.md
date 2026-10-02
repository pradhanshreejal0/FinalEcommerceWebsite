# Performance changes

This version keeps the existing ecommerce architecture and applies performance improvements:

- Cloudinary delivery URLs use automatic format/quality, DPR, and size transformations.
- Product-card images use responsive `srcSet` sizes instead of downloading full-size originals.
- Product-detail main images use responsive delivery sizes and prioritize only the first image.
- Shop initial product count was reduced from 48 to 24.
- Customer product-list requests use compact API responses.
- Customer product lists can skip the expensive `countDocuments()` operation when pagination totals are not displayed.
- Product detail view tracking no longer blocks the product response.
- Category filtering uses one category query instead of two.
- MongoDB uses a connection pool and sensible connection/socket timeouts.
- JSON API responses larger than 1 KB are gzip compressed when supported by the browser.
- Public category and ad responses have short browser/CDN cache lifetimes.
- Cloudinary upload source transformations now preserve up to 1600px while delivery transformations handle client-specific sizes.

## Important deployment note

If the backend is hosted on a sleeping Render instance, the first request after inactivity can still be slow because of a cold start. Code optimization cannot eliminate that platform-level startup delay. Use an always-on backend plan/instance if you need consistently low first-request latency.

## Environment files

No real `.env` files were included or modified. Configure your existing environment variables using the supplied `.env.example` files.

## Analytics and PDF reporting

Added a shared analytics/reporting system for admin and approved vendors:

- Monthly sales bar graph on Admin Dashboard.
- Monthly gross-sales bar graph on Vendor Dashboard.
- Date-range selector for 3, 6, or 12 months.
- Admin PDF report with platform sales, order value, commission, paid orders, marketplace counts, monthly sales, order status, and top products.
- Vendor PDF report with gross sales, vendor earnings, platform fee, orders, units sold, product count, low-stock count, monthly sales, top products, and order status.
- Reports are generated server-side from MongoDB data and protected by the existing role authorization middleware.
- Vendor report aggregation is restricted to the authenticated vendor's own `Vendor._id`.
- PDF download uses the authenticated access token and does not expose report data through a public URL.

### New server dependency

`pdfkit` is required by `server/utils/reportPdf.js`.

After replacing the project files, run:

```bash
cd server
npm install
```

Then start the server normally.
