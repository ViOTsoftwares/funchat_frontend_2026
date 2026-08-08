import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ROUTE_SEO_DATA = {
  "/": {
    title: "FunChat 2026 — Free Anonymous Video & Text Chat Platform",
    description:
      "Connect instantly with strangers worldwide on FunChat 2026. Private, fast, secure one-to-one text chat, WebRTC HD video calls, and topic communities with no registration required.",
    keywords:
      "anonymous chat, stranger video chat, private text chat, random video call, webrtc video chat, online communities, omegle alternative, funchat 2026",
    canonical: "https://funchat.live/",
  },
  "/chat": {
    title: "Live 1-on-1 Text Chat — Anonymous & Encrypted | FunChat 2026",
    description:
      "Start a live 1-on-1 text conversation with random people online. Fast instant matching, emoji reactions, end-to-end security with zero chat logs.",
    keywords:
      "1 on 1 text chat, anonymous messaging, random chat with strangers, live text chat, instant stranger matching",
    canonical: "https://funchat.live/chat",
  },
  "/video": {
    title: "HD Random Video Chat — Real-Time WebRTC Calls | FunChat 2026",
    description:
      "Experience crystal-clear HD video calls with strangers. Instant pairing, camera/microphone controls, and smart AI moderation for safe connections.",
    keywords:
      "random video chat, live stranger video call, webrtc video chat, cam chat, hd video chat with strangers",
    canonical: "https://funchat.live/video",
  },
  "/community": {
    title: "Topic Communities & Public Chatrooms — FunChat 2026",
    description:
      "Explore trending topic communities and public discussion rooms. Connect around gaming, tech, crypto, music, and creative arts in real time.",
    keywords:
      "chat communities, public discussion rooms, topic chatrooms, online discord alternative, funchat communities",
    canonical: "https://funchat.live/community",
  },
};

export default function SEO({
  title,
  description,
  keywords,
  canonical,
  ogImage = "https://funchat.live/og-banner.png",
  schemaType = "WebPage",
}) {
  const location = useLocation();

  useEffect(() => {
    const defaultData = ROUTE_SEO_DATA[location.pathname] || ROUTE_SEO_DATA["/"];
    const finalTitle = title || defaultData.title;
    const finalDesc = description || defaultData.description;
    const finalKeywords = keywords || defaultData.keywords;
    const finalCanonical = canonical || defaultData.canonical || `https://funchat.live${location.pathname}`;

    // Update Title
    document.title = finalTitle;

    // Helper to update or create meta tags
    const setMetaTag = (attrName, attrValue, content) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // Update Meta Description & Keywords
    setMetaTag("name", "description", finalDesc);
    setMetaTag("name", "keywords", finalKeywords);
    setMetaTag("name", "title", finalTitle);

    // Update Open Graph
    setMetaTag("property", "og:title", finalTitle);
    setMetaTag("property", "og:description", finalDesc);
    setMetaTag("property", "og:url", finalCanonical);
    setMetaTag("property", "og:image", ogImage);

    // Update Twitter Cards
    setMetaTag("name", "twitter:title", finalTitle);
    setMetaTag("name", "twitter:description", finalDesc);
    setMetaTag("name", "twitter:url", finalCanonical);
    setMetaTag("name", "twitter:image", ogImage);

    // Update Canonical link
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.setAttribute("rel", "canonical");
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute("href", finalCanonical);

    // Inject Route Specific JSON-LD Schema
    const scriptId = "route-jsonld-schema";
    let scriptElement = document.getElementById(scriptId);
    if (!scriptElement) {
      scriptElement = document.createElement("script");
      scriptElement.id = scriptId;
      scriptElement.type = "application/ld+json";
      document.head.appendChild(scriptElement);
    }

    const schemaData = {
      "@context": "https://schema.org",
      "@type": schemaType,
      url: finalCanonical,
      name: finalTitle,
      description: finalDesc,
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://funchat.live/",
          },
          ...(location.pathname !== "/"
            ? [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: finalTitle.split("—")[0].trim(),
                  item: finalCanonical,
                },
              ]
            : []),
        ],
      },
    };

    scriptElement.textContent = JSON.stringify(schemaData);
  }, [location.pathname, title, description, keywords, canonical, ogImage, schemaType]);

  return null;
}
