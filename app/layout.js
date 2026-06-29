import "./globals.css";
import { Plus_Jakarta_Sans, Fraunces, Spline_Sans_Mono } from "next/font/google";
import TopChrome from "../components/TopChrome";

// Typography: Plus Jakarta (sans), Fraunces (serif headings), Spline Mono (figures).
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-fraunces", display: "swap" });
const spline = Spline_Sans_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-spline", display: "swap" });

export const metadata = { title: "ShelfStory", description: "Account intelligence for field sales" };
export const viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable} ${spline.variable}`}>
      <body>
        <TopChrome />
        {children}
      </body>
    </html>
  );
}