/* eslint-disable @next/next/no-html-link-for-pages */

/**
 * Root-level 404 page — rendered outside the locale layout,
 * so next-intl and next/link are NOT available here.
 * Using a plain <a> is intentional.
 */
export default function RootNotFound() {
  return (
    <html>
      <body>
        <main style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ maxWidth: "28rem", textAlign: "center" }}>
            <h1 style={{ fontSize: "3.75rem", fontWeight: "bold", color: "#d1d5db" }}>404</h1>
            <h2 style={{ marginTop: "1rem", fontSize: "1.5rem", fontWeight: 600, color: "#111827" }}>
              Page not found
            </h2>
            <p style={{ marginTop: "0.5rem", color: "#4b5563" }}>
              The page you are looking for does not exist or has been moved.
            </p>
            <a
              href="/"
              style={{ marginTop: "1.5rem", display: "inline-block", padding: "0.75rem 1.5rem", backgroundColor: "#111827", color: "#fff", borderRadius: "0.375rem", textDecoration: "none", fontSize: "0.875rem" }}
            >
              Back to home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
