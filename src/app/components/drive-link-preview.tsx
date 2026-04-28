"use client";

import { Button } from "@/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/tooltip";
import { ExternalLink } from "lucide-react";

interface DriveLinkPreviewProps {
  fileUrl: string;
}

function getGoogleDrivePreviewUrl(fileUrl: string): string | null {
  const directMatch = fileUrl.match(/\/file\/d\/([^/]+)/);
  if (directMatch?.[1]) {
    return `https://drive.google.com/file/d/${directMatch[1]}/preview`;
  }

  try {
    const url = new URL(fileUrl);
    const fileId = url.searchParams.get("id");

    if (!fileId) {
      return null;
    }

    return `https://drive.google.com/file/d/${fileId}/preview`;
  } catch {
    return null;
  }
}

export function DriveLinkPreview({ fileUrl }: DriveLinkPreviewProps) {
  const previewUrl = getGoogleDrivePreviewUrl(fileUrl);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          align="center"
          sideOffset={10}
          className="w-80 border bg-popover p-0 text-popover-foreground shadow-lg"
        >
          <div className="border-b px-3 py-2 text-xs font-medium">Bill Preview</div>
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title="Bill Preview"
              className="h-72 w-full rounded-b-md bg-background"
              loading="lazy"
            />
          ) : (
            <div className="px-3 py-4 text-xs text-muted-foreground">
              Preview unavailable. Click to open the Drive file.
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
