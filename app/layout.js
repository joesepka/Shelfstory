import "./globals.css";
export const metadata = { title: "ShelfStory", description: "Account intel" };
export const viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };
export default function RootLayout({ children }) {
  return (<html lang="en"><body>{children}</body></html>);
}