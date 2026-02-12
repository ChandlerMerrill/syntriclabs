"use client";

import Script from "next/script";

export default function RelevanceAIWidget() {
  const shareId = process.env.NEXT_PUBLIC_RELEVANCE_AI_SHARE_ID;
  if (!shareId) return null;

  return (
    <Script
      src="https://app.relevanceai.com/embed/chat-bubble.js"
      data-relevanceai-share-id={shareId}
      data-share-styles={process.env.NEXT_PUBLIC_RELEVANCE_AI_SHARE_STYLES || ""}
      strategy="lazyOnload"
    />
  );
}
