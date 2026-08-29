@AGENTS.md

# IMPORTANT HANDOVER PROMPT FOR CLAUDE (Read Carefully)

You are taking over development for **Perenne**, an enterprise-grade EdTech SaaS application built for high school and A-Level students. 

## 1. App Overview & Core Features
Perenne is designed to be the ultimate AI study companion, focusing heavily on strict, syllabus-accurate grading and active recall. It replaces expensive tutors.
- **Exam Simulator (`/exam-sim`):** Generates custom, timed mock exams based on specific AQA syllabus topics. Once time runs out, the AI grades it brutally and provides exactly what bullet points the user missed.
- **Essay Grader (`/essay`):** Similar to Exam Sim, but for long-form essays. Extracts structure and penalizes missing AQA assessment objectives (AOs).
- **Quiz Maker & Flashcards:** Tests basic knowledge retention with instant feedback and visual progress.
- **Math Solver & Mindmaps:** For visual and step-by-step logical learning.
- **Dashboard / Analytics:** Tracks XP, weak points, and leaderboard standings using a highly gamified UI.
- **Anti-Cheat:** Sidebar navigation is locked down during active exams (via `beforeunload` events) to prevent users from looking up answers.

## 2. Tech Stack & Architecture
- **Framework:** Next.js (App Router, React).
- **Database:** Supabase (PostgreSQL) with Prisma/Drizzle or direct Supabase clients.
- **Authentication:** Clerk (managing sessions and tiers).
- **AI Models:** Deepseek-V4-Flash (for cost-efficient background grading/generation) and Claude 3.5 Haiku/Gemini for chat/fallback.
- **State Management:** Custom `usePersistentState` hook that syncs `localStorage` state keyed by `userId` to prevent data bleeding between multiple accounts on the same device.
- **Monetization:** Free tier (30k credits) and Premium tiers. The app includes strict credit checking (`canAfford`) and warning modals before running expensive generations.

## 3. The User & Marketing Strategy
- **The Founder:** The user you are talking to is a highly capable **GCSE/A-Level student** and solo founder. They are incredibly technically gifted and have built this entire stack from scratch. Treat them as a senior developer.
- **Current Marketing Strategy:** The user is launching the app organically via Reddit (`r/GCSE`, `r/6thForm`), Hacker News, and TikTok. 
- **The Hook:** *"I procrastinated studying for my actual exams by coding an AI that generates and grades my mock exams."* 
- **KPI:** The primary goal right now is hitting **>100 Clerk sign-ins** to prove Product-Market Fit.

## 4. Next Technical Steps
- **Voice Sprint (Speaking Examiner):** The user has a premade Claude version of a Voice Sprint feature (testing MFL/English speaking skills via microphone and TTS). Your job may be to help integrate this into the Next.js dashboard.
- **UI/UX Polish:** Keep the aesthetic hyper-modern, clean, and gamified. Always prioritize token efficiency when dealing with AI API routes.

---
*End of Handover Context. Proceed with helping the user build the future of education!*
