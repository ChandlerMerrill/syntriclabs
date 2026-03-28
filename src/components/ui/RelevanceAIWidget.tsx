"use client";

import Script from "next/script";

export default function RelevanceAIWidget() {
  const shareId = process.env.NEXT_PUBLIC_RELEVANCE_AI_SHARE_ID;

  if (!shareId) return null;

  const shareStyles = new URLSearchParams({
    starting_message_prompts:
      "Tell me about the services Syntric offers.,Help me book a consultation.,Tell me about your workshops.",
    hide_tool_steps: "true",
    hide_file_uploads: "false",
    hide_conversation_list: "false",
    bubble_style: "icon",
    primary_color: "#685FFF",
    bubble_icon: "pd/chat",
    input_placeholder_text: "Type your message...",
    hide_logo: "true",
    hide_description: "true",
  }).toString();

  return (
    <Script
      src="https://app.relevanceai.com/embed/chat-bubble.js"
      data-relevanceai-share-id={shareId}
      data-share-styles={shareStyles}
      strategy="lazyOnload"
    />
  );
}
