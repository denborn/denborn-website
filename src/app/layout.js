export const metadata = {};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  // Intentionally defer <html> and <body> to app/[locale]/layout.js
  return children;
}
