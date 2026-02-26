// Root layout — minimal shell required by Next.js App Router.
// All locale-aware content lives in src/app/[locale]/layout.tsx.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
