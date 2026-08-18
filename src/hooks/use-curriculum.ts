"use client";

import { usePersistentState } from "./use-persistent-state";

export type CurriculumLevel = "KS3" | "GCSE" | "A-Level";
export type CurriculumSubject = "Biology" | "Chemistry" | "Physics" | "Geography" | "English Language" | "English Literature";

export function useCurriculum() {
  const [level, setLevel, isLoadedLevel] = usePersistentState<CurriculumLevel>("perenne_curriculum_level", "GCSE");
  const [subject, setSubject, isLoadedSubject] = usePersistentState<CurriculumSubject>("perenne_curriculum_subject", "Biology");
  
  return {
    curriculumLevel: level,
    setCurriculumLevel: setLevel,
    curriculumSubject: subject,
    setCurriculumSubject: setSubject,
    isLoaded: isLoadedLevel && isLoadedSubject
  };
}
