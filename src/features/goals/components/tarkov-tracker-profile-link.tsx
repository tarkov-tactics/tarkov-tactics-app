"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const TARKOV_TRACKER_HOME = "https://tarkovtracker.io/";

/**
 * Primary CTA on the Directives PageHeader. Opens the TarkovTracker home in
 * a new tab. There is no public per-user profile URL on tarkovtracker.io
 * (the SPA gates progression behind auth), so we deliberately don't include
 * the userId — landing on the home view lets a logged-in user see their own
 * data. The label still says "Profile" to match the Stitch reference and
 * communicate intent to the user.
 */
export function TarkovTrackerProfileLink() {
  return (
    <Button
      variant="default"
      size="sm"
      nativeButton={false}
      render={
        <a
          href={TARKOV_TRACKER_HOME}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View profile on TarkovTracker.org (opens new tab)"
        />
      }
    >
      <ExternalLink className="size-3.5 mr-1.5" />
      View Profile on TarkovTracker.org
    </Button>
  );
}
