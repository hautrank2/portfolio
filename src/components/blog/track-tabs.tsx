"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

export type TrackTabsProps = {
  /** Ordered roadmap cards. Rendered on the server and passed in as children. */
  roadmap: React.ReactNode;
  /** Flat, newest-first listing of the notes that actually exist. */
  notes: React.ReactNode;
  noteCount: number;
};

/**
 * Two readings of the same track: the roadmap (ordered, includes the backlog)
 * and the notebook (only what is written, newest first).
 *
 * Client-side because Radix owns the tab state, but both panels are Server
 * Components handed in as props — no note content crosses the boundary.
 */
export const TrackTabs = ({ roadmap, notes, noteCount }: TrackTabsProps) => {
  return (
    <Tabs defaultValue="roadmap" className="w-full">
      <TabsList>
        <TabsTrigger value="roadmap">Lộ trình</TabsTrigger>
        <TabsTrigger value="notes">
          Tất cả note
          <span className="ml-1.5 tabular-nums opacity-60">{noteCount}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="roadmap" className="mt-6 space-y-4">
        {roadmap}
      </TabsContent>

      <TabsContent value="notes" className="mt-2">
        {notes}
      </TabsContent>
    </Tabs>
  );
};
