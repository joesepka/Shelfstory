import "./globals.css";
import { Inter_Tight, Inter, Plus_Jakarta_Sans } from "next/font/google";
import TopChrome from "../components/TopChrome";
import { ThemeProvider } from "../lib/theme";

// Typography (Joe's call, Aug 12 2026): Inter Tight for headlines + figures, Inter for
// body text, and the ShelfStory logo keeps its original Plus Jakarta wordmark.
const interTight = Inter_Tight({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-intertight", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-jakarta", display: "swap" });

export const metadata = {
  title: "ShelfStory",
  description: "Forecast Dashboard",
  // app/icon.svg is served by Next with the basePath already applied. Declaring it
  // here as well means the icon is visible in code review — a missing tab logo is
  // otherwise the kind of thing nobody notices for weeks.
  icons: { icon: "/blindcorner/mobile/icon.svg", shortcut: "/blindcorner/mobile/icon.svg", apple: "/blindcorner/mobile/icon.svg" },
};
export const viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${interTight.variable} ${inter.variable} ${jakarta.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('ssTheme');if(['cupertino','pixel','watercolor','lowpoly','bonsai'].indexOf(t)>=0)document.documentElement.dataset.theme=t;if(localStorage.getItem('ssMode')==='night')document.documentElement.dataset.mode='night';}catch(e){}" }} />
        <ThemeProvider>
          <TopChrome />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}