# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Level Up Recruitment - Operating System

## Project Overview
This is an internal recruitment operating system for Level Up, a specialist recruitment agency. It is NOT a public-facing website. It is the quality-control, intelligence, and operating layer for the recruitment team.

## Tech Stack
- Frontend: Next.js + Tailwind CSS
- Auth: Supabase Auth
- Database: Supabase Postgres
- Deployment: Vercel
- AI (later phase): Claude API

## Important Context
- Manatal remains the operational ATS. This app is the operating system layer on top of it.
- The Lovable public website is separate. This app connects to the same Supabase project.
- Build one phase at a time. Do not jump ahead.

## Business Rules (Never Break These)
- No role may move to sourcing until role intake is fully completed
- No candidate can be formatted until both Client Owner AND Talent Manager have approved
- Only the Client Owner can mark a candidate as submitted to client
- Interview prep must be completed before any interview is logged
- All candidate assessments must include evidence notes and risk notes — no exceptions
- Recruiters may use instinct only if validated by documented evidence

## User Roles
There are 3 roles stored in `user_profiles.role`:
1. Director — view everything, approve system changes, view all KPIs
2. Talent Manager — manage team, approve candidates, edit OS content, view all KPIs
3. Talent Specialist — create reviews, complete screenings, use prompts, submit for internal review

**Client Owner is NOT a role.** It is a responsibility: the Talent Specialist (or Talent Manager)
assigned to a specific client via `clients.owner_id`. When a candidate from that client enters
internal review, the assigned recruiter acts as the Client Owner approver.
- Client Owner panel in internal reviews: actionable only by the user whose `id` matches `clients.owner_id`
- Talent Manager panel: actionable by users with `role = talent_manager` or `role = director`

## Build Phases
### Phase 1 (Current) — Foundation
- Next.js app with Tailwind CSS
- Supabase connection and Auth
- User roles (Director, Talent Manager, Talent Specialist)
- Database schema: users, clients, roles, candidates
- Base dashboard with sidebar navigation

### Phase 2 — Operating Manual
- Operating Manual pages
- Prompt Library
- Training section

### Phase 3 — Client & Role Modules
- Clients CRUD + client grading
- Roles CRUD + role intake form + role codification
 
### Phase 4 — Candidate Assessment
- Candidates CRUD
- Candidate review scorecard
- Screening intelligence form

### Phase 5 — Approval Workflow
- Internal review workflow
- Client Owner approval
- Talent Manager approval

### Phase 6 — Submission & Interview
- CV formatting tracker
- Submission tracker
- Interview tracker

### Phase 7 — Offer & Placement
- Offer management
- Post-placement learning form

### Phase 8 — KPI Module
- Weekly KPI tracker
- Recruiter dashboard
- Manager view

### Phase 9 — AI Integration (Last)
- Generate role codification
- Generate screening questions
- Generate submission summaries

## UI Guidelines
- Clean, professional, minimal
- Recruiters are not technical — keep it simple and intuitive
- Use reusable components: StatusBadge, ScoreInput, RiskBadge, CandidateTierBadge, ApprovalPanel
- Candidate tiers: A = Exceptional, B = Strong, C = Viable, D = Weak, Reject = Do Not Progress
- Risk levels: Low, Medium, High, Critical

## Current Status
Phase 1 in progress.

## Supabase
Connection string to be provided by user.
