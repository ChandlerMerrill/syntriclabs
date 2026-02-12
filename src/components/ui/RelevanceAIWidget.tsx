"use client";

import Script from "next/script";

export default function RelevanceAIWidget() {
  const shareId = process.env.NEXT_PUBLIC_RELEVANCE_AI_SHARE_ID;
  if (!shareId) return null;

  return (
    <script
      defer
      data-relevanceai-share-id={shareId}
      src="https://app.relevanceai.com/embed/chat-bubble.js"
      data-share-styles="starting_message_prompts=Tell+me+about+the+services+Syntric+offers.&starting_message_prompts=Help+me+book+a+consultation.&starting_message_prompts=Tell+me+about+your+workshops.&hide_tool_steps=true&hide_file_uploads=false&hide_conversation_list=false&bubble_style=icon&primary_color=%23685FFF&bubble_icon=pd%2Fchat&input_placeholder_text=Type+your+message...&hide_logo=true&hide_description=true"
    ></script>
  );
}
