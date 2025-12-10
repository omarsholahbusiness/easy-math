"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface LiveEmbedProps {
  linkUrl: string;
  linkType: "ZOOM" | "GOOGLE_MEET" | string;
  isActive?: boolean;
}

export function LiveEmbed({ linkUrl, linkType, isActive = false }: LiveEmbedProps) {
  const isZoomOrMeet = linkType === "ZOOM" || linkType === "GOOGLE_MEET";

  if (isZoomOrMeet) {
    return (
      <div className="flex justify-center my-6">
        <Button
          onClick={() => {
            window.open(linkUrl, "_blank", "noopener,noreferrer");
          }}
          disabled={!isActive}
          className="bg-[#0083d3] hover:bg-[#0083d3]/90 text-white px-8 py-6 text-lg"
          size="lg"
        >
          <ExternalLink className="mr-2 h-5 w-5" />
          {linkType === "ZOOM" ? "انضم إلى Zoom" : "انضم إلى Google Meet"}
        </Button>
      </div>
    );
  }

  // For other link types, use iframe
  return (
    <div className="w-full my-6">
      <iframe
        src={linkUrl}
        className="w-full h-[600px] rounded-lg border"
        allow="camera; microphone; fullscreen; display-capture"
        allowFullScreen
        title="Live Stream"
      />
    </div>
  );
}

