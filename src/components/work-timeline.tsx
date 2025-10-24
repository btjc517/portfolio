"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";
import { ExperienceTimelineItem } from "./ruixen/experience-time-line-item";
import { Badge } from "./ui/badge";
import { WorkExperience } from "@/types/experience-types";

interface WorkTimelineProps {
  experiences: readonly WorkExperience[];
}

export const WorkTimeline: React.FC<WorkTimelineProps> = ({ experiences }) => {

  const visibleExperiences = experiences;

  return (
    <AnimatePresence>
      <div className="flex flex-col gap-3">
        {visibleExperiences.map((work, index) => (
          <ExperienceTimelineItem
            key={`${work.company}-${work.start}`}
            work={work}
            index={index}
          />
        ))}
      </div>
    </AnimatePresence>
  );
};
