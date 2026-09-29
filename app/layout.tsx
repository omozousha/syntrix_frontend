import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Doto, Space_Grotesk, Space_Mono } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeSync } from "@/components/providers/theme-sync";
import { LocaleSync } from "@/components/providers/locale-sync";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Nothing Design font stack:
// - Doto: display/hero (≥36px)
// - Space Grotesk: body/UI
// - Space Mono: data, labels (ALL CAPS instrumentation)
const fontDisplay = Doto({
  variable: "--font-nd-display",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const fontBody = Space_Grotesk({
  variable: "--font-nd-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const fontMono = Space_Mono({
  variable: "--font-nd-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Syntrix",
    template: "%s | Syntrix",
  },
  description: "Synchronization & Validation Matrix untuk inventory, validasi, dan approval aset jaringan.",
  applicationName: "Syntrix",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('syntrix-theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = theme === 'dark' || (theme !== 'light' && prefersDark);
                  document.documentElement.classList.toggle('dark', isDark);
                } catch(e) {}

                // Suppress browser extension hydration noise (Bitdefender, Grammarly, etc.)
                // Root cause: Bitdefender injects bis_skin_checked/bis_register attributes into
                // existing DOM elements before React hydrates, causing mismatch on the actual element.
                // Fix: MutationObserver strips these attributes the moment they appear, so React
                // sees a clean DOM at hydration time.
                try {
                  if (typeof window !== 'undefined' && window.MutationObserver) {
                    var STRIP_ATTRS = ['bis_skin_checked', 'bis_register'];
                    var stripAttrs = function(el) {
                      if (!el || el.nodeType !== 1) return;
                      for (var i = 0; i < STRIP_ATTRS.length; i++) {
                        var attr = STRIP_ATTRS[i];
                        if (el.hasAttribute && el.hasAttribute(attr)) {
                          el.removeAttribute(attr);
                        }
                      }
                    };
                    var stripAll = function(root) {
                      stripAttrs(root);
                      var nodes = root.querySelectorAll ? root.querySelectorAll('[bis_skin_checked],[bis_register]') : [];
                      for (var i = 0; i < nodes.length; i++) stripAttrs(nodes[i]);
                    };
                    var mdObserver = new MutationObserver(function(mutations) {
                      for (var i = 0; i < mutations.length; i++) {
                        var m = mutations[i];
                        if (m.type === 'attributes') {
                          stripAttrs(m.target);
                        } else if (m.type === 'childList') {
                          for (var j = 0; j < m.addedNodes.length; j++) {
                            var node = m.addedNodes[j];
                            if (node.nodeType === 1) stripAll(node);
                          }
                        }
                      }
                    });
                    // Observe before body is fully parsed so Bitdefender injection is caught live.
                    mdObserver.observe(document.documentElement, {
                      childList: true,
                      subtree: true,
                      attributes: true,
                      attributeFilter: STRIP_ATTRS,
                    });
                    // Also suppress any console.error that still slips through (React puts diff in later args).
                    var origError = console.error;
                    console.error = function() {
                      for (var i = 0; i < arguments.length; i++) {
                        var arg = arguments[i];
                        if (typeof arg === 'string' && (arg.indexOf('bis_skin_checked') !== -1 || arg.indexOf('bis_register') !== -1)) {
                          return;
                        }
                      }
                      origError.apply(console, arguments);
                    };
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col grain-overlay" suppressHydrationWarning>
        <ThemeSync />
        <LocaleSync />
        <QueryProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
