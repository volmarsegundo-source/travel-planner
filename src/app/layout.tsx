// Root layout — pass-through shell required by Next.js App Router.
// The real <html>/<body> tags live in src/app/[locale]/layout.tsx.
// Rendering them here too would produce invalid nested <html><body> tags.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
