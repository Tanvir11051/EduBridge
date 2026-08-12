import { createFileRoute } from "@tanstack/react-router";

// TODO Phase 2: replace with a Gemini-powered chatbot built in Google Antigravity.
export const Route = createFileRoute("/api/chatbot")({
  server: {
    handlers: {
      POST: async () =>
        Response.json({
          reply: "Thanks for your message! The AI assistant will be available soon.",
        }),
    },
  },
});
