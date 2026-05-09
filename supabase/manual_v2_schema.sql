-- =============================================================================
-- Level Up Operating System — Operating Manual v2 Schema + Seed
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

create table public.manual_sections (
  id uuid default gen_random_uuid() primary key,
  section_number int not null unique,
  title text not null,
  slug text not null unique,
  created_at timestamptz default now() not null
);

create table public.manual_articles (
  id uuid default gen_random_uuid() primary key,
  section_id uuid references public.manual_sections(id) on delete cascade not null,
  article_number text not null,
  title text not null,
  slug text not null,
  content text not null,
  last_edited_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(section_id, slug)
);

create table public.manual_article_versions (
  id uuid default gen_random_uuid() primary key,
  article_id uuid references public.manual_articles(id) on delete cascade not null,
  previous_content text,
  new_content text not null,
  changed_by uuid references public.user_profiles(id) on delete set null,
  change_summary text,
  created_at timestamptz default now() not null
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.manual_sections enable row level security;
alter table public.manual_articles enable row level security;
alter table public.manual_article_versions enable row level security;

-- manual_sections policies
create policy "manual_sections_read" on public.manual_sections
  for select to authenticated using (true);

create policy "manual_sections_insert" on public.manual_sections
  for insert to authenticated
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('talent_manager', 'director')
    )
  );

create policy "manual_sections_update" on public.manual_sections
  for update to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('talent_manager', 'director')
    )
  );

create policy "manual_sections_delete" on public.manual_sections
  for delete to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('talent_manager', 'director')
    )
  );

-- manual_articles policies
create policy "manual_articles_read" on public.manual_articles
  for select to authenticated using (true);

create policy "manual_articles_insert" on public.manual_articles
  for insert to authenticated
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('talent_manager', 'director')
    )
  );

create policy "manual_articles_update" on public.manual_articles
  for update to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('talent_manager', 'director')
    )
  );

create policy "manual_articles_delete" on public.manual_articles
  for delete to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('talent_manager', 'director')
    )
  );

-- manual_article_versions policies
create policy "manual_article_versions_read" on public.manual_article_versions
  for select to authenticated using (true);

create policy "manual_article_versions_insert" on public.manual_article_versions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('talent_manager', 'director')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTIONS
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.manual_sections (section_number, title, slug) values
(1,  $$Recruitment Philosophy$$,          $$recruitment-philosophy$$),
(2,  $$Team Roles and Responsibilities$$, $$team-roles$$),
(3,  $$Client Management Rules$$,         $$client-management$$),
(4,  $$Role Management Rules$$,           $$role-management$$),
(5,  $$Candidate Standards$$,             $$candidate-standards$$),
(6,  $$Submission Rules$$,                $$submission-rules$$),
(7,  $$Interview Management$$,            $$interview-management$$),
(8,  $$Offer Management$$,                $$offer-management$$),
(9,  $$AI Usage Rules$$,                  $$ai-usage$$),
(10, $$KPI and Performance Standards$$,   $$kpi-performance$$);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: RECRUITMENT PHILOSOPHY
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$recruitment-philosophy$$),
  $$1.1$$,
  $$Why We Exist$$,
  $$why-we-exist$$,
  $$**The Standard**
Level Up exists to solve a specific business problem: companies that need specialist talent cannot find it reliably through job boards or generalist agencies, and candidates with real capability are poorly served by recruiters who treat them as transactions.

**Why This Matters**
Specialist recruitment is not posting jobs and waiting. It is understanding a business, a team, a hiring manager's actual problem, and the market landscape well enough to identify and engage the right person — not just the first available person. Generalist agencies spread too thin to do this. Job boards do not do it at all. When we get it right, we reduce bad hires, save clients time and money, and help candidates land roles that actually advance their careers. That is the commercial case for our existence. If we are not operating at this level consistently, we are just another agency.

## What We Owe Clients
Clients hire us because they cannot or do not want to solve the problem themselves. We owe them honest advice, a thorough process, quality candidates, and clear communication — not volume, not speed for its own sake, and not false promises about turnaround time.

## What We Owe Candidates
Candidates trust us with their career decisions. We owe them honesty about the role and the client, useful feedback whether they progress or not, and respect for their time. We do not pitch roles we haven't properly understood. We do not disappear after a placement.

## Why Specialist Matters
When a client needs a specific type of finance professional or a niche technical specialist, the right candidate pool is small. Finding and engaging that pool requires deep market knowledge, credibility, and relationships that take years to build. That is what we sell. That is what justifies our fee.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$recruitment-philosophy$$),
  $$1.2$$,
  $$Our Standard of Work$$,
  $$our-standard-of-work$$,
  $$**The Standard**
High-performance recruitment is measured by placement quality and client outcomes, not by the number of CVs sent, calls made, or roles opened. Activity that does not serve delivery is noise.

**Why This Matters**
The South African recruitment market has no shortage of agencies willing to flood clients with CVs and hope something sticks. That approach destroys trust, wastes everyone's time, and produces bad hires. Our value is in doing the opposite: fewer, better-qualified candidates with documented evidence of fit. One strong submission beats five weak ones every time.

## What High-Performance Looks Like
A high-performing recruiter at Level Up does the following consistently: completes intake before sourcing, submits candidates they can defend, maintains communication without chasing for the sake of it, documents their reasoning, and reviews what went wrong when placements don't happen. They are not reactive. They do not wait to be chased. They manage their pipeline proactively.

## Activity vs Output
Filling your calendar with calls is not the same as moving roles forward. Sending three CVs is not the same as submitting three qualified candidates. Track what matters: roles with complete intake, candidates submitted with approval, offers made, placements landed. Those are outputs. Everything else is activity.

## What We Will Not Compromise On
We will not submit a candidate we cannot confidently recommend. We will not open a search without a proper intake. We will not promise clients timelines we cannot deliver. We will not give candidates false hope about their prospects. These are not aspirational standards — they are the baseline. Anything below this is not acceptable work at Level Up.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$recruitment-philosophy$$),
  $$1.3$$,
  $$How We Think About Clients$$,
  $$how-we-think-about-clients$$,
  $$**The Standard**
Clients are long-term partners, not individual revenue events. How we manage a client relationship determines whether a single placement becomes a retained partnership or a one-off transaction.

**Why This Matters**
A client who trusts you gives you quality roles, respects your advice, responds quickly, and extends your fee without negotiating you into the ground. A client who does not trust you will manage you like a vendor — slow feedback, low fees, multiple agencies on the same role. The difference between these two outcomes is almost entirely determined by how you managed the relationship from the first engagement.

## What a Good Client Relationship Looks Like
Good client relationships are characterised by: direct access to the hiring manager (not just HR), honest and timely feedback, clear and agreed-upon role briefs, realistic salary budgets, and mutual respect for each other's expertise. When something goes wrong — and it will — good client relationships absorb it. Bad ones collapse.

## How Client Quality Affects Your Performance
A recruiter spending most of their time on D-grade clients — slow-responding, over-demanding, budget-misaligned — will always underperform relative to their effort. Client grading is not an administrative exercise. It is a resource-allocation tool. Your best work goes to your best clients.

## Why We Grade Clients
The grading system exists to make explicit what recruiters often feel but do not act on. A D-grade client consumes disproportionate time, delivers low placement rates, and drags morale. Grading creates a documented basis for having a frank conversation with the client, redirecting your effort, or recommending an exit. Grades change over time — a C-grade client who starts responding quickly and giving quality feedback can move to B. A B-grade client who becomes unresponsive after a placement falls through moves down. Grades are reviewed quarterly.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$recruitment-philosophy$$),
  $$1.4$$,
  $$How We Think About Candidates$$,
  $$how-we-think-about-candidates$$,
  $$**The Standard**
Candidates are professionals with careers worth respecting. The difference between placing a candidate and serving their career is the difference between a transaction and a relationship that generates referrals, trust, and long-term market presence for Level Up.

**Why This Matters**
The South African professional talent pool in any specialist field is not large. A candidate you treat poorly today is the hiring manager you pitch to in five years, or the referral you never get, or the review that damages your reputation. Beyond commercial self-interest: candidates make significant life decisions based on information we give them. That responsibility is real and should be treated as such.

## What We Owe Candidates
We owe candidates honest information about the role — including what we know and what we do not. We owe them a real assessment of their fit, not false confidence to keep them engaged. We owe them timely feedback after every stage, whether or not they progress. We owe them a conversation about their motivations and career goals before we pitch a role. And we owe them honesty if the role is not right for them, even if it costs us a short-term placement opportunity.

## Placing vs Serving a Career
A recruiter who places candidates in roles that are wrong for them may hit short-term revenue targets. Within six to twelve months, those candidates have left the role, the client is frustrated, and the recruiter has lost the relationship on both sides. Serving a candidate's career means understanding what they actually want, what their risk factors are, what would make them leave within 90 days, and whether this role genuinely serves them. That process takes time but produces placements that stick.

## Building Lasting Candidate Relationships
Candidates who are not right for a current role are still worth your time if they are strong professionals. Follow up. Check in after they start a new role elsewhere. Add them to a talent pool. The best candidates are referred to you by candidates you placed well or treated honestly even when you had nothing for them.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$recruitment-philosophy$$),
  $$1.5$$,
  $$What We Will Not Do$$,
  $$what-we-will-not-do$$,
  $$**The Standard**
There are non-negotiable lines in how we operate with clients, candidates, and each other. These are not preferences — they are standards that define what Level Up is and protects the business, the team, and our reputation.

**Why This Matters**
Every agency has values on a wall. Very few enforce them when they are commercially inconvenient. Our non-negotiables matter precisely when they are inconvenient — when a client is pressuring us for a fast submission we are not ready to make, or when a candidate would accept an offer we know is wrong for them. These standards are what separates us from average agencies, and they are what earns the trust that drives long-term revenue.

## With Clients
We will not promise delivery timelines we cannot support with evidence. We will not submit candidates we cannot recommend in order to fill a shortlist. We will not hide known risks about a candidate to close a placement. We will not accept roles without a proper intake, regardless of client pressure.

## With Candidates
We will not ghost a candidate after they enter our process. We will not pitch a role to a candidate without understanding their career goals first. We will not pressure a candidate to accept an offer that conflicts with their stated priorities. We will not misrepresent a role, a client, or the market to keep a candidate engaged.

## With Each Other
We will not undermine a colleague's client or candidate relationship. We will not take credit for work we did not do. We will not hide problems that affect team performance. We will give honest feedback, even when it is uncomfortable.$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: TEAM ROLES AND RESPONSIBILITIES
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$team-roles$$),
  $$2.1$$,
  $$Director$$,
  $$director$$,
  $$**The Standard**
The Director holds commercial oversight, sets system standards, and provides team direction. Decisions that affect the business model, fee structures, client exits, or team structure sit at this level.

**Why This Matters**
Not every decision needs to escalate to Director level, and clogging that channel creates bottlenecks. Understanding which decisions sit here ensures the team operates with appropriate autonomy while the Director retains visibility over what matters commercially and strategically.

## Commercial Oversight
The Director is accountable for revenue targets, fee structures, and the quality of client relationships at the senior level. This includes approving any non-standard commercial terms, reviewing grade-A client relationships, and making calls on whether to exit problem clients.

## System Standards
The Director approves changes to the Operating Manual, the Prompt Library, and any scoring or grading criteria used across the system. These are not decisions for individual recruiters to make unilaterally, because they affect team-wide quality standards.

## Team Direction
Performance management at the team level, hiring decisions, and structural changes in how the team operates sit with the Director. Day-to-day performance management sits with the Talent Manager.

## When Decisions Sit Here
Escalate to Director when: a client relationship has broken down beyond what a Talent Manager can reset; a candidate is raising legal or ethical concerns; a commercial arrangement departs significantly from standard terms; a team issue cannot be resolved at manager level.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$team-roles$$),
  $$2.2$$,
  $$Talent Manager$$,
  $$talent-manager$$,
  $$**The Standard**
The Talent Manager is accountable for team delivery quality, candidate approval, and day-to-day performance standards. They are the quality gate between Talent Specialist work and what reaches clients.

**Why This Matters**
Without a functioning quality gate, Talent Specialists submit candidates based on individual judgment that may not yet be calibrated to Level Up's standards. The Talent Manager role exists to catch errors before they reach clients, not to add bureaucracy — but that distinction requires the Talent Manager to engage critically with each submission rather than rubber-stamp it.

## Team Performance
The Talent Manager tracks each Talent Specialist's pipeline weekly, identifies where roles are stalling, and intervenes before problems become placements lost. This is not micromanagement — it is active delivery management.

## Candidate Approval
The Talent Manager approves candidates for submission in the internal review process. This means reviewing the candidate assessment, not just the CV. They must be satisfied that the tier assignment is justified, risks are documented, and the candidate is genuinely right for the role before approving.

## Day-to-Day Delivery Standards
The Talent Manager holds the standard on intake quality, screening documentation, candidate communication, and client update frequency. They are the first person a Talent Specialist should consult when they are unsure about a decision.

## When to Escalate to Director
Escalate when a client situation is beyond the Talent Manager's authority to resolve, when a candidate raises legal concerns, when a team performance issue requires formal action, or when a commercial question involves non-standard fee terms.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$team-roles$$),
  $$2.3$$,
  $$Client Owner$$,
  $$client-owner$$,
  $$**The Standard**
Client Owner is a responsibility, not a title or a role in the system. It means the Talent Specialist or Talent Manager assigned to a specific client is accountable for the quality of every interaction, submission, and relationship outcome with that client.

**Why This Matters**
Shared client ownership creates no ownership. When everyone can touch a client, no one is accountable for the relationship. The Client Owner model ensures that one person carries full accountability for the client experience from intake to placement and beyond.

## What Ownership Means in Practice
The Client Owner is the primary point of contact for their client. They conduct the intake, manage the relationship, and make the final call on which candidates to submit. They are the person the client calls when something goes wrong, and they are the person accountable when a placement falls through.

## Approval Authority in Internal Review
When a candidate goes through internal review for a Client Owner's client, the submission panel for that client is actionable only by the person whose ID matches the client record. This is a hard system rule, not a suggestion. It prevents a Talent Manager from overriding a Client Owner's relationship knowledge without that person's explicit involvement.

## Accountability Is the Point
Being a Client Owner is not a reward for seniority. It is a commitment. Client Owners are expected to know their clients well enough to advise them honestly, to challenge briefs that are wrong, and to recommend against sourcing when the conditions are not right. That requires relationship depth that only comes from consistent, high-quality engagement over time.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$team-roles$$),
  $$2.4$$,
  $$Talent Specialist$$,
  $$talent-specialist$$,
  $$**The Standard**
The Talent Specialist is responsible for sourcing, screening, candidate assessment, and workflow execution. Excellence at this level means doing the fundamentals exceptionally well and consistently — not cutting corners when the pipeline is full.

**Why This Matters**
Most recruitment errors originate at the Talent Specialist level: incomplete intakes that lead to wrong sourcing profiles, screening calls that miss key risk factors, assessments submitted without evidence. These errors compound downstream. A strong Talent Specialist prevents problems rather than creating them.

## Core Responsibilities
Talent Specialists own the following: searching and identifying candidate pools, conducting screening calls against a documented standard, completing candidate assessments with evidence and risk notes, submitting candidates into internal review, and maintaining candidate communication throughout the process. They do not submit directly to clients — that gate belongs to the Client Owner.

## What Excellence Looks Like
An excellent Talent Specialist knows the role they are sourcing for as well as they know the candidate they are assessing. They have read the codified role brief, they understand the hiring manager's actual problem, and they can articulate why a specific candidate fits — or does not fit — in a single paragraph that is specific to that role, not generic praise.

## How to Grow From Specialist to Client Owner
Client ownership is earned by demonstrating consistent quality at the Specialist level and showing the relationship skills required to manage a client independently. The path is: consistent high-quality submissions, sound candidate assessments that hold up under Talent Manager scrutiny, proactive communication, and at least one successful managed delivery before being assigned a client owner responsibility.

## What Will Not Be Tolerated
Submitting candidates without completing the assessment form. Running screening calls without preparation. Giving candidates feedback that was not reviewed by a Talent Manager when the feedback is sensitive. Disappearing from a candidate's process without handing it over.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$team-roles$$),
  $$2.5$$,
  $$How the Team Works Together$$,
  $$how-the-team-works-together$$,
  $$**The Standard**
The team operates on clear decision rights and defined escalation paths. Collaboration is expected; unclear accountability is not tolerated. Good internal communication is a professional standard, not a nice-to-have.

**Why This Matters**
Recruitment teams that operate without clear ownership structures waste time, duplicate effort, confuse clients, and lose candidates in the gaps. The Level Up operating model assigns specific accountabilities to each role. Understanding where your responsibility ends and where to hand off is as important as the work itself.

## Decision Rights
Talent Specialists make calls on: which candidates to approach, how to conduct screening, what tier to assign, and how to handle candidate objections within their portfolio. They escalate to Client Owners or Talent Managers when: a candidate raises concerns they are not equipped to handle, an assessment is borderline, or a client makes contact with them directly about a role that has a Client Owner assigned.

## Escalation Paths
Talent Specialist → Client Owner (for client-specific decisions, submission advice, relationship context)
Talent Specialist → Talent Manager (for process questions, candidate approval, escalated candidate concerns)
Client Owner → Talent Manager (for quality issues, internal review disagreements, resource support)
Talent Manager → Director (for commercial decisions, client exits, team performance issues)

## How Client Owners and Talent Specialists Collaborate
On roles where a Talent Manager or Talent Specialist is doing the sourcing work for a Client Owner's client, the Client Owner must brief the Talent Specialist properly — not just forward the intake form. They must be available to answer questions during the search and remain the point of contact for the client throughout.

## Internal Communication Standards
Use the system to document decisions, not just outcomes. If you changed strategy on a role, record why. If a candidate raised a risk factor, note it. Internal communication should reduce ambiguity for anyone who picks up a file after you. Never rely on verbal handoffs for decisions that affect submission or client communication.$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: CLIENT MANAGEMENT RULES
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$client-management$$),
  $$3.1$$,
  $$Client Ownership$$,
  $$client-ownership$$,
  $$**The Standard**
Every client has one named owner. Ownership is not shared, and it does not default to whoever is working a current role. It is an explicit assignment that carries commercial and relationship accountability.

**Why This Matters**
When client ownership is ambiguous, clients get inconsistent service, internal conflicts emerge over submissions, and accountability is diffused to the point where no one is truly responsible. Single ownership is not a bureaucratic rule — it is what makes consistent, high-quality client delivery possible.

## What Ownership Means in Practice
The Client Owner is the primary relationship holder. They conduct or oversee intake calls, they have final say on which candidates are submitted, they manage client communication, and they are responsible for the client's grade and the quality of the Level Up relationship with that client.

## How Ownership Is Allocated
Ownership is assigned at the point a new client relationship is initiated, typically to the recruiter who developed the relationship. New clients may be assigned to a Talent Manager who then involves Talent Specialists in delivery. Ownership changes when: a Client Owner leaves the business, a client requests a change, or the Talent Manager or Director determines the relationship is not being adequately managed.

## When Ownership Changes
Changes in client ownership require documentation in the system and a handover conversation — ideally with the client informed of the transition. Cold handovers where a client suddenly receives communications from a different recruiter without explanation damage trust and must be avoided.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$client-management$$),
  $$3.2$$,
  $$Client Grading System$$,
  $$client-grading-system$$,
  $$**The Standard**
Every client is graded A through D based on relationship quality, role quality, commercial terms, and hiring behaviour. Grades determine how much time and resource Level Up invests in that client. Grades are reviewed quarterly.

**Why This Matters**
Without a grading system, recruiters allocate effort based on who shouts loudest or most recently — not based on which clients are actually worth the investment. A D-grade client consuming 30% of your week is a resource problem that directly caps your performance on better clients.

## Grade Definitions

**A-Grade Client**
Excellent relationship. Direct access to hiring manager. Quality roles with realistic budgets. Fast, honest feedback. Pays fees without issue. Would be a reference. Deserves your best candidates and fastest turnaround.

**B-Grade Client**
Good relationship with some friction. Mostly quality roles. Reasonable feedback speed. Minor commercial issues that are manageable. Investable, but with eyes open. Most clients should sit here or move toward A.

**C-Grade Client**
Inconsistent. Slow feedback, occasionally unrealistic briefs, possible fee disputes in the past. Worth maintaining but not prioritising. Requires a conversation about expectations before additional investment is justified.

**D-Grade Client**
Consistently problematic: poor communication, unrealistic requirements, fee avoidance attempts, disrespectful to candidates or recruiter. Do not prioritise. Begin the exit conversation or impose strict terms.

## What To Do With a D-Grade Client
The default is not to exit immediately. The default is to have a frank conversation about why the relationship is not working and what would need to change for it to improve. If that conversation does not produce a response within one hiring cycle, recommend exit to Director.

## Grade Changes
Grades change based on evidence. Document what changed and when. A client who has moved from B to C should have a note explaining the trigger.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$client-management$$),
  $$3.3$$,
  $$Client Communication Standards$$,
  $$client-communication-standards$$,
  $$**The Standard**
Clients receive proactive, structured updates at defined intervals. Communication should add information — it should not be a check-in with no substance. No client should ever have to chase Level Up for a status update.

**Why This Matters**
The single most common client complaint across the South African recruitment market is poor communication from agencies. It is not about capability — most clients will tolerate a slower search if they are kept informed. Communication silence is interpreted as a lack of effort, even when the recruiter is working hard. This is a preventable trust problem.

## Communication Frequency

**Active Search (First 2 Weeks)**
Update every 2–3 business days. Even if there is nothing to report, say so with context: what you have done, what the market looks like, what you are doing next. A market intelligence update is always valuable.

**Ongoing Search (Week 3+)**
Weekly update minimum. This should include: pipeline status, candidates in process, any market feedback that is relevant to the brief, and a view on timeline.

**Candidate in Process**
Update within 24 hours of any change — interview confirmed, interview feedback received, offer being considered. Do not wait for the client to ask.

## Handling No Response
If a client does not respond to two communications in a row, escalate internally before sending a third. The absence of response is information — it may indicate the role is on hold, the hiring manager has changed, or the client is dissatisfied. Do not keep sending updates into silence without investigating.

## What Poor Communication Costs
Late or absent updates lead to clients going to other agencies, clients losing confidence in candidates you submitted, and placements lost at offer stage because someone else got there first. Communication is a commercial activity, not an administrative one.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$client-management$$),
  $$3.4$$,
  $$When to Escalate a Client Issue$$,
  $$when-to-escalate-client-issue$$,
  $$**The Standard**
Client issues that cannot be resolved within two interactions at the Talent Specialist or Client Owner level must be escalated. Do not manage a deteriorating client relationship alone and in silence.

**Why This Matters**
Escalating a client issue is not an admission of failure — it is a professional judgment that the situation has moved beyond what your role and authority can resolve. Waiting too long to escalate turns manageable problems into lost clients and damaged placements.

## Triggers for Escalation
Escalate immediately when any of the following occur: a client makes a complaint about Level Up's service quality; a client attempts to bypass the fee agreement; a client's behaviour toward a candidate raises ethical or legal concerns; a placement falls through with significant commercial consequences; a client's communication has stopped entirely for two or more weeks with no explanation.

## Who to Escalate To
Talent Specialists escalate to their Client Owner or Talent Manager. Client Owners escalate to the Talent Manager. Talent Managers escalate to the Director. Do not skip levels unless the situation is urgent and the intermediate person is unavailable.

## How to Document
Before escalating, write a brief summary: what happened, what was communicated, what the client's response was, and what you need from the escalation. This prevents a second-hand account from losing critical detail.

## What Happens After
The person you escalate to owns the next step. Once you have escalated with full documentation, do not continue independently managing the issue unless explicitly asked to. Mixed signals to clients from multiple team members escalate problems.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$client-management$$),
  $$3.5$$,
  $$How to Handle a Difficult Client$$,
  $$how-to-handle-difficult-client$$,
  $$**The Standard**
A difficult client is one whose behaviour makes quality delivery hard. A bad client is one whose behaviour consistently makes it impossible. These are different problems that require different responses.

**Why This Matters**
Labelling a client as difficult without distinguishing between manageable friction and structural incompatibility leads to either over-investing in relationships that will never improve or exiting clients who could have been reset with the right conversation. The distinction matters commercially.

## Defining Difficult vs Bad
A difficult client may be: slow to give feedback, unclear in their briefs, occasionally unrealistic about salary, or resistant to candidate recommendations for reasons they cannot articulate. These are friction points that can be managed with better communication, clearer expectation-setting, and honest conversation.

A bad client is one who: consistently misrepresents role requirements, disrespects candidates during process, attempts to avoid fee obligations, or creates a hostile environment for Level Up staff. These clients require a different response.

## Resetting a Difficult Relationship
The reset conversation is direct: "We want to make this work, but we need to be honest about what is making it difficult." Name the specific behaviours — slow feedback, changing brief, unrealistic salary — and ask what is driving them. Most difficult client behaviour has a reason. A hiring manager under internal pressure behaves differently from a hiring manager who simply does not value the process. Understanding the reason changes the solution.

## When to Recommend Exiting
Recommend exit when: the reset conversation has happened and the behaviour has not changed within one role cycle; when a client's conduct creates reputational or legal risk for Level Up; when the Client Owner's grade is D and has been for two consecutive quarters with no improvement trajectory. Exit recommendations require Director sign-off.$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: ROLE MANAGEMENT RULES
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$role-management$$),
  $$4.1$$,
  $$How to Open a Role$$,
  $$how-to-open-a-role$$,
  $$**The Standard**
A role is not open until the intake is complete and documented in the system. A phone call with a client, a job spec in your inbox, or a verbal confirmation that a role exists is not sufficient to begin sourcing.

**Why This Matters**
Sourcing on an incomplete brief produces candidates who do not fit, wastes client and candidate time, damages your credibility, and generates activity without output. The intake process exists to gather the information required to source the right profile — not to tick a compliance box.

## Steps From Brief to Activated Search

**Step 1: Initial Client Conversation**
Understand what the client is asking for at a high level. Confirm that Level Up has been formally engaged (not just informally asked). Do not commit to any timeline yet.

**Step 2: Schedule a Formal Intake Call**
This is not a repeat of the initial conversation. The intake call is structured around the role intake form and requires the hiring manager's direct involvement, not just HR.

**Step 3: Complete the Role Intake Form**
Every field must be completed or explicitly documented as unknown with a reason. Partial intakes are rejected.

**Step 4: Role Codification**
Convert the intake information into a sourcing profile. This is the document that drives the search.

**Step 5: Activate in the System**
Only once the codification is complete does the role move to active sourcing status in the system. The system enforces this gate.

## Why We Do Not Start Sourcing on a Phone Call
A phone call gives you a hiring manager's first-draft thinking, not their real requirements. Business context, team dynamics, what the previous person in the role got wrong, and what success looks like in twelve months rarely emerge in a first call. The intake process surfaces these, and they are critical to sourcing the right person.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$role-management$$),
  $$4.2$$,
  $$Role Intake Standards$$,
  $$role-intake-standards$$,
  $$**The Standard**
A complete role intake contains everything needed to define the right candidate profile, understand the business context, and set sourcing strategy. Incomplete intakes are returned for completion before any sourcing begins, without exception.

**Why This Matters**
A recruiter who sources without a complete intake is guessing. They may be making educated guesses, but they are still guessing. The intake process converts a hiring manager's requirements into a factual brief that can be used to evaluate candidates objectively. Missing information creates subjective assessment, which leads to inconsistent quality and weak submissions.

## Required Fields — No Exceptions

**Business Context**
What is the business problem this role solves? Why does it exist now? What happens if it is not filled in the next 90 days? What has changed in the business or team that has made this role necessary?

**Role Definition**
Not just job title — what does success in this role look like at 3 months, 6 months, and 12 months? What decisions will this person make? What will they not make? Who will they work with?

**Team and Manager Context**
Who does the role report to? What is the manager's style? What has worked and not worked in the team historically? If this is a replacement role, why did the previous person leave?

**Candidate Profile**
What qualifications, skills, and experience are non-negotiable vs preferred? What type of person succeeds in this team and this company culture?

**Commercial Terms**
Confirmed salary range, benefits, remote or in-office, start date requirement, exclusivity terms.

## Fields That Cannot Be Left Blank
Business problem, success definition, reporting line, confirmed salary range, and non-negotiable candidate requirements. If any of these are missing, the intake is incomplete regardless of how much other information exists.

## What Happens if Intake Is Incomplete
The role is not opened in the system. The Client Owner contacts the client to obtain the missing information. If the client cannot or will not provide it, that is documented and the Talent Manager is informed before any decision to proceed is made.

## Why Business Problem and Success Definition Matter More Than Job Spec
A job spec is a description of inputs. A business problem and success definition describe the outputs the client actually needs. Sourcing to a job spec produces candidates who look right on paper. Sourcing to a business problem produces candidates who will actually solve it. These are not the same candidate pool.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$role-management$$),
  $$4.3$$,
  $$Role Codification Process$$,
  $$role-codification-process$$,
  $$**The Standard**
Role codification converts a completed intake into a sourcing intelligence document. This document replaces the job spec as the recruiter's working reference during search and assessment.

**Why This Matters**
The job spec is a client-facing marketing document. It describes what the client would like. The role codification is an internal strategic document. It describes what the client actually needs, why they need it, what the right candidate looks like in practice, and where in the market to find them. These are fundamentally different tools for different purposes.

## What a Role Codification Contains
A completed role codification should include: a one-paragraph business context summary; a candidate success profile (what the right person actually looks like, not a list of job spec bullet points); a list of sourcing channels and search terms; must-have vs nice-to-have criteria with the reasoning for each; risk factors to assess for during screening; and the key questions the screening call must answer.

## The Difference Between a Job Spec and a Role Codification
A job spec says: "5+ years of experience in financial analysis, advanced Excel, CA(SA) preferred." A role codification says: "We need someone who can build models independently without templates, has worked in a business where they were challenged commercially, can present to a non-finance executive audience, and is motivated by complexity rather than process. The CA(SA) is a proxy for analytical rigour, not a hard requirement if we can evidence that in another way."

## How to Use the Role Codification Prompt
The Role Codification prompt in the Prompt Library takes structured intake information and produces a first draft codification. Review this draft critically — AI-generated codifications need recruiter validation before use. The output is a starting point, not a final document. Edit it to reflect anything the AI missed or got wrong about the context.

## What the Output Should Contain
A finished codification is one page maximum. It is specific, not generic. It contains judgment calls the recruiter has made about trade-offs in the brief. It is useful on day one and still useful on week four of the search.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$role-management$$),
  $$4.4$$,
  $$When a Role Can Move to Sourcing$$,
  $$when-role-can-move-to-sourcing$$,
  $$**The Standard**
A role moves to active sourcing only when the intake is complete, the codification is finalised, and both have been reviewed. This is a system-enforced gate, not a judgment call.

**Why This Matters**
Sourcing the wrong profile is the most expensive mistake in recruitment. It wastes recruiter time, candidate time, and client goodwill. It produces activity on the system that creates false confidence about search progress. And it delays the correct search by weeks. The gate exists to make this outcome structurally impossible, not just unlikely.

## The Sourcing Checklist
Before a role moves to sourcing, the following must be true:
- Role intake form is 100% complete with no blank mandatory fields
- Salary range is confirmed and documented
- Hiring manager has been directly involved in intake (not just HR)
- Role codification has been created and reviewed by the Client Owner
- Sourcing channels have been identified
- The screening question set has been prepared

## Why This Gate Exists
The most common version of this problem in South African recruitment: a client calls with a role brief, the recruiter is keen to demonstrate responsiveness, and within 24 hours they are sending LinkedIn messages to candidates with a vague brief and an unconfirmed salary range. When a strong candidate asks about the package, the recruiter cannot answer. The candidate disengages. Two weeks of effort is wasted.

## Cost of Sourcing the Wrong Profile
Every hour spent approaching candidates who do not fit the role is an hour not spent approaching candidates who do. Beyond time: approaching wrong-profile candidates creates market noise, can damage Level Up's reputation with strong professionals in a sector, and produces zero pipeline value.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$role-management$$),
  $$4.5$$,
  $$How to Manage a Role Pipeline$$,
  $$how-to-manage-role-pipeline$$,
  $$**The Standard**
Every live role is reviewed weekly. Pipeline data must be accurate and current. Strategy changes are documented with reasoning. Clients are managed proactively through search, not reactively when asked for an update.

**Why This Matters**
A role pipeline that is not actively managed will stall. Candidates go cold. Clients lose confidence. Recruiters lose visibility of where things stand. Weekly pipeline review is not an administrative task — it is a delivery management discipline that separates recruiters who close roles from those who always have reasons why they have not.

## Weekly Role Review Standards
For each live role, review: how many candidates have been approached in the last seven days; how many are in active conversation; what feedback has been received from client on any submissions; whether the sourcing strategy is still correct or needs adjustment; and what the client expects to hear this week.

## How to Track Progress
Progress is not "number of CVs sent." Progress is: qualified candidates engaged, screening calls completed, candidates submitted and approved, interviews scheduled, client feedback received. These are the milestones that matter. Track them accurately.

## When to Change Strategy on a Live Role
Change strategy when: two weeks of sourcing on a specific profile has produced zero qualified candidates; client has rejected three or more candidates without clear feedback that points to a brief problem; the market evidence suggests the brief is wrong and needs a client conversation.

## Managing Client Expectations During Slow Search
When search is slow, tell the client early and with specifics. "The market for this profile in Cape Town is thinner than we expected — here is what we are seeing and what we are doing about it." That is a professional update. Going silent because you have nothing to report is not.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$role-management$$),
  $$4.6$$,
  $$When to Close a Role$$,
  $$when-to-close-a-role$$,
  $$**The Standard**
A role is closed when it is placed, formally withdrawn by the client, or determined to be unfillable under current conditions. Every closure is documented with a reason and a post-closure note.

**Why This Matters**
Roles that linger in a live state without active progress create false pipeline data, waste review time, and obscure the real state of the business. Closing a role correctly — and documenting why — produces learning that improves future searches.

## Triggers for Closing

**Placed:** Candidate has accepted offer, start date confirmed, and fee agreement triggered. Document placement details before closing.

**Closed Lost:** Client awarded the role to another agency, hired directly, or terminated the search without a placement. Document which agency placed (if known), what the successful candidate's profile was, and what Level Up learned.

**On Hold:** Client has paused the search temporarily with a stated intention to re-open. Set a review date. Do not treat on hold as a permanent state — if the role has not moved in 60 days, reclassify as closed.

## What to Document at Closure
Every closed role should have: final status, reason for closure, any placement details (if placed), and a brief post-closure note covering what Level Up would do differently. This note does not need to be long — three sentences is enough if they are honest.

## Post-Closure Learning
Post-closure notes feed into search strategy improvement. If the same brief has been closed lost twice in 12 months, that is a pattern worth investigating. Was the problem the client? The brief? The sourcing strategy? The salary? Document it.$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: CANDIDATE STANDARDS
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$candidate-standards$$),
  $$5.1$$,
  $$What Makes a Submittable Candidate$$,
  $$what-makes-a-submittable-candidate$$,
  $$**The Standard**
A submittable candidate is one you can confidently recommend in writing to a client — not one who is close enough to take a chance on. The minimum standard is a completed assessment with documented evidence of fit and documented risk notes, resulting in a tier of C or above.

**Why This Matters**
Every weak submission erodes client trust. Clients do not say "I appreciate the effort" when you send them someone who is clearly not right — they say "Level Up does not understand what we are looking for." This costs you relationships, repeat business, and future access. The standard is not high because we are being precious — it is high because our commercial model depends on clients trusting our judgment.

## The Minimum Submission Standard
To be submitted, a candidate must have: a completed candidate assessment in the system; a documented tier (C or above); specific evidence notes explaining why they fit the role criteria; documented risk notes covering any concerns; Client Owner approval; and Talent Manager approval. Meeting all of these is the floor, not the ceiling.

## Why We Do Not Submit to Fill a Shortlist
Clients ask for three CVs. That does not mean you send three CVs if you only have one strong candidate. Send the strong candidate and tell the client you are continuing to source. Submitting two additional weak candidates to appear thorough does the opposite — it tells the client you cannot distinguish between strong and average.

## The Cost of Weak Submissions
A weak submission that reaches interview stage wastes the client's time, destroys the candidate's confidence when they receive no feedback, and signals that your assessment process cannot be trusted. One placement from three strong submissions is worth more commercially and relationally than two interviews from six weak ones.

## The Tier System Explained
A-tier candidates are exceptional: strong commercial awareness, clear career trajectory, excellent communication, obvious fit. B-tier candidates are strong: solid experience, good culture fit indicators, manageable risk factors. C-tier candidates are viable: they meet the core requirements and could succeed in the role, but require a clear explanation of why the limitations are acceptable. D-tier candidates are weak and should not be submitted. Reject-tier candidates should never have been screened.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$candidate-standards$$),
  $$5.2$$,
  $$CV Review Standards$$,
  $$cv-review-standards$$,
  $$**The Standard**
A CV is evidence, not a verdict. Review it critically — for what it says, what it omits, what the patterns suggest, and what requires validation in the screening call.

**Why This Matters**
Most recruitment errors begin with an inadequate CV review. Either the recruiter accepts the CV at face value and misses red flags, or they reject it too quickly based on surface-level mismatches. Strong CV review is a skill that produces better screening conversations, better candidates, and fewer wasted submissions.

## How to Read a CV Critically

**Start with the career narrative**
Does this person's career make sense? Are the moves logical, or are there patterns that need explaining? Short tenures, repeated lateral moves without progression, gaps, or a trajectory that has recently stalled — these are not disqualifiers but they are questions.

**Check tenure and progression**
Has this person been promoted within organisations, or are they always leaving to get the title they wanted? Internal progression is a strong signal of performance. Jumping for titles without a history of promotion elsewhere can mean they have not been backed at home.

**Look for specificity over scope**
Weak CVs describe roles. Strong CVs describe outcomes. "Managed a team of eight" tells you nothing. "Grew the team from three to eight over 18 months and reduced churn from 40% to 15%" tells you how this person thinks about their work.

## Red Flags Most Recruiters Miss
Employment dates that do not add up. Vague descriptions of the most recent role (often a sign it ended badly). Claimed responsibilities that contradict the company's known size or structure. Qualifications without graduation years. A CV rewritten to match a specific job posting so closely that it loses credibility.

## Difference Between a Strong CV and a Strong Candidate
A strong CV is a document. A strong candidate is a person. Some of the best candidates are poor CV writers. Some polished CVs belong to poor performers. The CV tells you what to ask in the screening call — it does not tell you what the answer will be.

## What to Validate in Screening
Every CV review should produce a list of three to five specific things to validate in the screening call. Document these before the call. They become the spine of your screening conversation.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$candidate-standards$$),
  $$5.3$$,
  $$Screening Call Standards$$,
  $$screening-call-standards$$,
  $$**The Standard**
A screening call is a structured interview, not a conversation. Every call must validate specific role criteria, assess motivation, identify risk factors, and produce a documented assessment before the call ends. Underprepared screening calls are not screening calls — they are chats that produce no usable data.

**Why This Matters**
The screening call is where the quality of your submission is determined. Everything that follows — the assessment, the tier, the client conversation — depends on how well you conducted this call. A weak screening call produces a weak assessment, which produces a weak submission, which produces a frustrated client. It is a compounding problem that starts here.

## How to Prepare
Before every screening call, you must have: re-read the role codification; reviewed the CV with specific questions documented; confirmed what must be validated before the call can be concluded; and identified the primary risk factors to probe.

## What Must Be Validated Before the Call Ends
Regardless of role, every screening call must validate: the candidate's actual reason for considering a move (not their first answer — probe deeper); their current and expected compensation; their notice period and availability; their specific understanding of what this role involves; and whether their career motivations align with what this role offers.

## How to Probe Without Interrogating
The screening call should feel like a professional conversation to the candidate. The structure is in your preparation, not in how you present it. Ask open questions. Follow the answer, not the script. When something is vague, ask specifically: "Can you walk me through that in more detail?" Not: "What exactly do you mean by that?" The tone is curiosity, not suspicion.

## A Weak vs Strong Screening Call
A weak screening call: mostly confirms what is on the CV, fails to probe motivation or risk, produces a generic summary, and does not give the candidate a real sense of the role. A strong screening call: surfaces specific evidence of relevant experience, uncovers the real reason for the job search, identifies counter-offer risk, gives the candidate a realistic and compelling picture of the role, and produces a documented assessment with specific evidence and risk notes.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$candidate-standards$$),
  $$5.4$$,
  $$Candidate Tier System$$,
  $$candidate-tier-system$$,
  $$**The Standard**
Every candidate assessed at Level Up is assigned a tier — A, B, C, D, or Reject — based on documented evidence. Tier assignments without evidence are not valid. Instinct-based tiers must be noted as such and supported by as much contextual reasoning as possible.

**Why This Matters**
Tier discipline protects clients from weak submissions and protects candidates from being pitched into roles they cannot succeed in. Without consistent tier standards, the tier system becomes noise — every recruiter uses it differently, and it stops being useful as a quality signal.

## Tier Definitions With Practical Examples

**A — Exceptional**
Growth-oriented, commercially aware, self-aware, opportunity-focused. Strong in every area that matters for this specific role. Can articulate their career trajectory with clarity. Would succeed in this role and likely exceed the hiring manager's expectations. Rare. Do not over-apply this tier to avoid devaluing it.
*Example: A financial analyst who has independently built pricing models, understands the commercial implications of their work, has been promoted twice in four years, and can explain why this role is the right next step for them.*

**B — Strong**
Solid experience, good culture fit indicators, manageable and documented risk factors. May have one area below ideal but brings enough elsewhere that the trade-off is clearly worth it. The majority of strong submissions should be B-tier.
*Example: A candidate with all the technical skills and strong tenure but moving for purely financial reasons — risk documented, contextually managed.*

**C — Viable**
Meets core requirements. Has limitations that are acknowledged and explained. Would not be the obvious hire but can succeed. Requires a clear rationale for submission and client must be fully informed of the trade-offs.
*Example: A candidate with the right experience but only 18 months in their current role — brief tenure noted, context explained (restructure), trade-off discussed with client.*

**D — Weak**
Does not meet core requirements. Lacks evidence of required capability. Do not submit.

**Reject — Do Not Progress**
Has a disqualifying factor: misrepresentation on CV, unacceptable conduct during screening, or profile fundamentally incompatible with role requirements.

## How to Tier When Unsure
Default to C and document why you are unsure. Bring the case to the Talent Manager for a second opinion before submitting. Do not submit at C without full disclosure to the client about the limitation.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$candidate-standards$$),
  $$5.5$$,
  $$How to Handle Candidate Objections$$,
  $$how-to-handle-candidate-objections$$,
  $$**The Standard**
A candidate objection is information, not an obstacle. Understand what is driving it before you respond. Pressure is never the right response. Walking away may sometimes be the right one.

**Why This Matters**
Recruiters who treat objections as problems to overcome place candidates in roles they did not want. Those candidates leave. The client is frustrated. The recruiter loses the relationship on both sides. Understanding the real driver of an objection and responding honestly produces better outcomes for everyone, even when the outcome is a candidate declining to proceed.

## At the Approach Stage
The most common objections at approach are: "I am not looking right now," "I am happy where I am," and "I have heard about this role already." Most of these are screening responses, not genuine rejections. Respond by demonstrating that you have done your homework and this role is genuinely relevant to their profile. Do not pitch the role — pitch the conversation. If they decline a second time with specifics, respect it.

## At the Screening Stage
At screening, objections often surface around salary, role scope, company, or location. These require factual responses: what the package actually is, what the growth path looks like, what you know about the company that they may not. If their objection reveals a genuine misalignment, acknowledge it. Do not paper over a structural mismatch with optimistic framing — this produces drop-outs later.

## At the Offer Stage
Offer stage objections are frequently counter-offer signals or unresolved concerns about the role. "I need to think about it" after a strong process usually means either the offer is below expectation, a counter-offer is coming, or there is a specific concern that was not addressed. Ask directly: "What would need to be different for this to be a clear yes?" That question is more useful than any amount of gentle persuasion.

## Genuine Objection vs Negotiating Position
Candidates sometimes object to create leverage. They sometimes object because they have a real concern. The difference is usually visible in the specificity of the objection. "The salary is a bit low" is a negotiating position. "I have a child starting school in September and this role requires relocation within six months" is a genuine constraint. Respond to each accordingly.

## When to Walk Away
When a candidate is not interested and has said so clearly, respect it. Do not continue to engage a reluctant candidate. A placement against someone's genuine wishes will not last.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$candidate-standards$$),
  $$5.6$$,
  $$Candidate Communication Rules$$,
  $$candidate-communication-rules$$,
  $$**The Standard**
Every candidate in our process receives timely, honest, and useful communication at every stage. Ghosting a candidate is never acceptable, regardless of where they are in the process.

**Why This Matters**
The South African recruitment market has a poor reputation for candidate communication. Most professionals have been ghosted by agencies after an interview, or received feedback so vague it was useless. We can differentiate entirely on this dimension. It costs nothing extra to communicate well, and it generates referrals, goodwill, and trust that compounds over time.

## Response Time Standards
Candidate enquiries get a response within one business day. Post-interview feedback is communicated within 24 hours of receiving client feedback — not held until you have "better news." Offer communication happens the same day it is received. No exceptions to these standards.

## How to Give Feedback Candidates Can Actually Use
Vague feedback — "you were not quite the right fit" — is worse than no feedback at all because it sounds like something was said when nothing was. Useful feedback is specific: "The client felt your experience was stronger in a generalist finance context and they needed someone with a tighter specialisation in treasury. That is not a reflection of your capability — it is a brief issue." Even when the real feedback is "the client preferred someone else without being able to say why," say that honestly.

## What to Say When You Have Nothing to Say
If you are waiting on client feedback and you told a candidate you would call on Tuesday, call on Tuesday and say you are still waiting. "I do not have an update yet, but I wanted to let you know I am following up and will have something for you by end of this week." That is a useful communication. It costs two minutes and maintains trust.

## Why Ghosting Is Never Acceptable
A candidate you ghosted remembers. They tell other professionals. They may be the hiring manager at your next client. Beyond the commercial argument: these are people who trusted you with a significant career decision. Treating that with silence is a failure of basic professional conduct.$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: SUBMISSION RULES
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$submission-rules$$),
  $$6.1$$,
  $$Internal Review Process$$,
  $$internal-review-process$$,
  $$**The Standard**
Every candidate must receive two approvals before being submitted to a client: one from the Client Owner and one from the Talent Manager. These are not formalities — they are quality gates that each require independent review of the candidate assessment.

**Why This Matters**
Single-reviewer processes fail because no individual has perfect judgment all of the time. The Client Owner brings relationship context — they know what the client actually values, what the hiring manager's real concerns are, and whether this candidate will land well. The Talent Manager brings quality control — they ensure the assessment is complete, the tier is justified, and the risks are documented. Neither review alone is sufficient.

## What the Client Owner Reviews
The Client Owner is assessing whether this candidate is the right fit for this specific client and hiring manager, given their direct knowledge of the relationship. They should ask: Does this candidate address the actual business problem? Are there any client-specific concerns this person will trigger? Can I defend this submission in a client call?

## What the Talent Manager Reviews
The Talent Manager is assessing whether the assessment process was conducted correctly and whether the quality standard is met. They should ask: Is the tier justified by the evidence? Are the risk notes complete? Did the screening call cover the required criteria? Would I be comfortable with this submission representing Level Up?

## What Happens When They Disagree
Disagreement between Client Owner and Talent Manager is resolved through a direct conversation, not by one overriding the other silently. If the disagreement is substantive, the Talent Manager has final say on quality grounds. If the Client Owner believes the Talent Manager is applying a standard inconsistent with the client's actual requirements, they escalate to the Director.

## The Cost of Skipping This Step
Skipping internal review produces submissions that are poorly defended, inaccurate in tier, or missing critical risk disclosures. When those submissions reach the client and fall short, the cost is the client relationship — not just the placement fee.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$submission-rules$$),
  $$6.2$$,
  $$CV Formatting Standards$$,
  $$cv-formatting-standards$$,
  $$**The Standard**
A formatted CV is clean, consistent, and free of any information that could bias or compromise the assessment. It represents the candidate's experience accurately while meeting Level Up's professional standard.

**Why This Matters**
Clients judge the quality of your work partly by the quality of what you send them. A poorly formatted CV with inconsistent fonts, unexplained gaps, or distracting personal information signals that Level Up does not pay attention to detail. The formatted CV is your calling card.

## What a Formatted CV Must Contain
Name, professional summary (written for this specific role), career history with dates, key achievements, relevant qualifications, and contact details linking to Level Up as the point of contact (not the candidate's personal email).

## What Must Be Removed
Personal photographs (unless the candidate specifically requests it and the client context supports it), ID numbers, home addresses, date of birth, marital status, and references. Remove any information that could introduce bias unrelated to professional capability.

## How to Use Claude for Formatting
The CV Formatting prompt in the Prompt Library produces a clean reformatted version of the candidate's CV. Review the output before sending. Check that: no factual information has changed; the professional summary is accurate and role-specific; formatting is consistent; and the candidate's voice is preserved — AI reformatting tends toward corporate blandness, which is not the goal.

## Quality Check Before Submission
Before the formatted CV is attached to a submission, it must be reviewed by the recruiter who screened the candidate. They are the last quality check. Any CV submitted without this review is a risk.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$submission-rules$$),
  $$6.3$$,
  $$What Goes in a Submission Pack$$,
  $$what-goes-in-submission-pack$$,
  $$**The Standard**
A submission pack consists of a formatted CV and a candidate snapshot. The snapshot is not optional — it is often the first thing the client reads and determines whether the CV receives serious consideration.

**Why This Matters**
A CV without context is just a document. A strong candidate snapshot frames the candidate's strengths, addresses the most obvious gaps, and tells the client specifically why this person was submitted for this role. It is the difference between presenting a candidate and delivering a recommendation.

## What the Candidate Snapshot Must Contain
The snapshot is a half-page to one-page document that covers: why this candidate was selected for this role (specific, not generic); their strongest relevant experience and what the evidence for it is; any risk factors and how they have been assessed; their motivation for the move and why it is credible; and their current situation (notice period, expected package, availability).

## Why the Snapshot Matters as Much as the CV
Hiring managers are busy. Many will read the snapshot before opening the CV. If the snapshot is strong, they will engage with the CV carefully. If the snapshot is weak or absent, the CV has to do all the work cold — and strong CVs without context often lose to weaker CVs that come with a confident recommendation.

## Format
The snapshot should be sent in the body of the submission email, not as an additional attachment. Keep it clear and factual. Use the Submission Snapshot prompt from the Prompt Library for a first draft, then edit to reflect your specific knowledge of the candidate and the client.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$submission-rules$$),
  $$6.4$$,
  $$How to Present a Candidate to a Client$$,
  $$how-to-present-candidate$$,
  $$**The Standard**
Presenting a candidate to a client is a recommendation, not a presentation of options. You are telling the client: this person can do the job and here is why. Your delivery must be confident, evidence-based, and honest about risks.

**Why This Matters**
Recruiters who hedge their submissions — "she might be worth a look," "I am not 100% sure but" — tell the client that they are not confident in their own recommendation. If you are not confident, do not submit. If you are confident, say so and be specific about why.

## The Submission Conversation
When you follow up a submission with a call or email, cover three things: why you submitted this specific person, what makes them particularly right for this role (not just generally strong), and what you want the client to do next (confirm interest, arrange a call, share feedback by a specific date).

## Framing Strengths Without Over-Selling
State what the evidence shows, not what you hope it shows. "He has built three planning models from scratch in his current role and has been commended by the CFO for commercial accuracy" is better than "he is an exceptional planner." Specific evidence builds more confidence than superlatives.

## How to Disclose Risks Without Killing the Candidacy
Every strong candidate has a risk factor or a limitation. Disclose it clearly, with context: "She has only 18 months in her current role. That is below your preference, but the context is a company restructure that eliminated her function — not a performance issue. I have validated this." Hiding risk factors that emerge later destroys trust. Front-loading them with context maintains it.

## When a Client Pushes Back
If a client pushes back on a submission, do not immediately capitulate. Ask what specifically is not landing. If the concern is substantive, acknowledge it. If the concern is a misread — the client has missed something in the CV or snapshot — address it with facts. You are the expert on this candidate. Act like it.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$submission-rules$$),
  $$6.5$$,
  $$Managing Client Feedback$$,
  $$managing-client-feedback$$,
  $$**The Standard**
Feedback from clients is gathered within 48 hours of any stage, relayed to candidates within 24 hours of receipt, and used to improve future submissions on the same role. Feedback that is vague is probed for specifics before it is accepted.

**Why This Matters**
Feedback is one of the highest-value information sources in a live search. It tells you how well your assessment is calibrated to the client's real requirements, what the hiring manager actually values versus what they said they valued in the intake, and whether the brief itself needs to be updated. Recruiters who treat feedback as a box to tick miss all of this.

## How to Chase Feedback Professionally
Follow up on post-submission feedback after two business days if you have not heard. Send one message: "I wanted to follow up on the submissions from earlier this week — do you have any initial thoughts?" If no response by day four, call. If still no response by day six, document and review whether the role is still active.

## What to Do With Vague Feedback
"Not quite the right fit" and "we are looking for someone a bit more senior" are not useful feedback. Probe: "Can you help me understand specifically what was missing? Was it the technical background, the industry experience, or the seniority level?" Most clients give vague feedback not because they are being evasive but because they have not been asked a specific enough question.

## Using Feedback to Improve Future Submissions
If a client rejects two or three candidates in a row with similar feedback, update the role codification. The brief has either changed or was never right. Have a direct conversation with the client before submitting again.

## When Feedback Signals a Brief Problem
"We want someone younger" or "we prefer someone from the big four" without clear justification are signals that the brief contains requirements that were not disclosed at intake. Address these directly and document the conversation.$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: INTERVIEW MANAGEMENT
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$interview-management$$),
  $$7.1$$,
  $$Interview Preparation Standards$$,
  $$interview-preparation-standards$$,
  $$**The Standard**
Every candidate entering an interview through Level Up has received a structured pre-interview brief from their recruiter. No candidate enters an interview unprepared if it is within the recruiter's power to prevent it. Interview prep is the recruiter's accountability, not the candidate's.

**Why This Matters**
An unprepared candidate reflects poorly on Level Up, not just on themselves. The client asked us to send someone credible. If that person arrives unprepared, we have failed the brief. Beyond the commercial argument: sending a candidate into a high-stakes conversation without adequate preparation is a disservice to a person who trusted us to support them.

## The Minimum Prep Standard
Before every interview, the candidate must have received: a confirmed briefing call or document covering the company, the role, the interviewer and their background, likely questions based on the role, how to present their experience for this specific opportunity, logistics, and what the client expects from the first meeting.

## Why Prep Is Non-Negotiable
Even strong candidates get stronger with preparation. They present their experience more precisely, ask better questions, and engage more confidently with the hiring manager. Preparation does not mean scripting — it means clarity.

## What Happens When Candidates Go in Unprepared
Unprepared candidates give generic answers, cannot connect their experience to the role requirements, miss opportunities to ask intelligent questions, and leave the interview without a clear sense of next steps. The client notices. The candidate does not progress. The recruiter loses the placement and possibly the relationship.

## Recruiter Accountability
If a candidate goes into an interview without adequate prep and performs below their capability as a result, that is a recruiter failure. Document what prep was provided and when. If a candidate refuses prep, note that — it is itself a risk signal worth documenting.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$interview-management$$),
  $$7.2$$,
  $$How to Brief a Candidate Before an Interview$$,
  $$how-to-brief-candidate$$,
  $$**The Standard**
The pre-interview brief is a structured call, not a quick check-in. It covers the company, the role, the people, the likely format, key messages the candidate should land, and logistics. It takes 20 to 30 minutes and must happen the day before the interview at the latest.

**Why This Matters**
A rushed brief the morning of an interview does not allow the candidate time to internalise the information, prepare their answers, or resolve concerns. The brief is an investment in the outcome. Treat it as such.

## The Pre-Interview Call Structure

**1. Company Context (5 minutes)**
What does the company do, how does it make money, what is its current situation, who are the key people the candidate should know about? Do not just repeat what is on the website — add what you know from the client relationship.

**2. Role and Hiring Manager Context (5 minutes)**
What does the hiring manager care about most? What is the business problem behind this role? What does success look like in the first 90 days? What kind of candidate tends to land well with this manager?

**3. Likely Questions and Key Messages (10 minutes)**
Based on the role, what are the two or three most important things the candidate needs to convey? What questions are they likely to face and how can they structure strong answers without scripting them? How should they frame their reason for leaving their current role?

**4. Logistics and Expectations (5 minutes)**
Confirm the format, time, location or link, who they will meet, how long it will run, and what the process looks like after this stage.

## What Not to Over-Script
Do not write their answers for them. Over-scripted candidates sound coached, and good interviewers notice. Your job is to give them the context and confidence to be their best self, not to turn them into a puppet of your submission narrative.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$interview-management$$),
  $$7.3$$,
  $$Post-Interview Debrief Process$$,
  $$post-interview-debrief$$,
  $$**The Standard**
A debrief call happens with the candidate within two hours of the interview and with the client within 24 hours. Both calls follow a structured format. The outputs from both are documented in the system.

**Why This Matters**
The post-interview debrief is where you gather the information that determines the next step: whether to progress, how to position the candidate for the next stage, what concerns need addressing, and whether the client's feedback is consistent with their stated brief. Missing or delaying debriefs means making decisions on incomplete information.

## Debrief Call Structure — Candidate

**Immediate Reaction:** How do they feel it went overall? What moments felt strongest? What felt uncertain?

**Role Assessment:** After meeting the team and hearing more about the role, are they still engaged? More engaged or less? What specifically landed well or raised concerns?

**Counter-Offer Temperature Check:** Are they expecting any counter-offer from their current employer? Has anything changed in their thinking about their current role since the interview?

**Next Steps:** What do they want to happen next? Are they actively at other stages that you need to factor in?

## Debrief Call Structure — Client

**Overall Impression:** How did they rate the candidate overall? Against what they discussed in the intake, where does this person sit?

**Specific Strengths and Concerns:** What specifically impressed them? What concerns came up that were not visible in the submission? Are those concerns factual or stylistic?

**Next Steps:** Are they progressing? What does the timeline look like for the next stage or decision?

## How to Synthesise Both Perspectives
Document the candidate's view and the client's view separately, then note any divergence. A candidate who believes they interviewed well but a client who is hesitant is a gap worth managing. Address it before it reaches the candidate as a rejection without context.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$interview-management$$),
  $$7.4$$,
  $$Managing Multiple Interview Stages$$,
  $$managing-multiple-interview-stages$$,
  $$**The Standard**
Every stage of a multi-stage process is actively managed. Candidates are not left to drift between stages. Clients are not allowed to drag timelines without being managed. Your job does not end when an interview is confirmed.

**Why This Matters**
Multi-stage processes create multiple opportunities for candidates to disengage, for competing offers to arrive, and for clients to lose momentum. Recruiters who manage these processes actively keep both sides moving and close placements. Recruiters who assume things will progress on their own lose candidates between stages.

## Maintaining Candidate Engagement Across a Long Process
Check in with the candidate after every stage: confirm they progressed, gauge their continued enthusiasm, and identify any concerns before they become withdrawals. If the process is taking longer than expected, be honest about it. A candidate who feels managed and informed stays engaged. A candidate who has not heard from you in two weeks starts applying elsewhere.

## Managing Timeline Expectations
Agree on timelines with the client at the start of the process and document them. When those timelines slip — and they frequently do — address it immediately with the client. "We discussed a two-week turnaround after stage one. We are now at three weeks and my candidate has had two other approaches. Can we confirm next steps by end of this week?"

## What to Do When the Process Drags
When a process stalls beyond what is reasonable, you have three tools: escalate with the client contact, involve the Director if the relationship warrants it, and be honest with the candidate about where things stand. Do not allow a candidate to sit in limbo without full transparency.

## Keeping the Client Moving
Clients do not always understand the cost of a slow process. Your job is to make it concrete: "Your preferred candidate has a competing offer with a three-day response window. If we do not move on this by Thursday, you will lose them." This is not pressure — it is market reality, and it is your job to communicate it.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$interview-management$$),
  $$7.5$$,
  $$How to Handle a Failed Interview$$,
  $$how-to-handle-failed-interview$$,
  $$**The Standard**
When a candidate is rejected after an interview, the recruiter responds within the same business day, conducts an honest debrief with both candidate and client, and documents the learning before deciding whether to re-present or move on.

**Why This Matters**
How you handle a failed interview determines whether the candidate remains a constructive participant in your network and whether the client trusts your process. A well-handled rejection maintains both relationships. A poorly handled rejection costs both.

## Immediate Response
Call the candidate as soon as you have the feedback — do not email a rejection. The call should be brief, honest, and human. You have specific feedback, you are going to share it, and you want to understand how they are feeling before you do.

## Honest Debrief With Candidate and Client
With the candidate: share the specific feedback, not a softened version. If the client said their presentation style was too casual for the culture, say so. If they said the candidate could not give concrete examples, say so. Vague feedback protects no one.

With the client: ask what specifically did not land and whether there is any part of the brief that this candidate's performance has revealed as different from the original intake. Failed interviews often surface brief misalignments.

## Whether to Re-Present or Move On
Re-present if: the client's rejection was stylistic and the candidate's capability is still right; the brief has shifted and there is a better way to position the candidate for the revised requirement. Move on if: the rejection was substantive and reflects a genuine mismatch.

## Post-Failure Learning
Document what the failure revealed about the brief, the candidate assessment, or the interview preparation. One honest post-failure note is worth more to future search quality than ten successful placements that were not examined.$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8: OFFER MANAGEMENT
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$offer-management$$),
  $$8.1$$,
  $$How to Manage an Offer$$,
  $$how-to-manage-an-offer$$,
  $$**The Standard**
An offer is not the end of the process — it is the most sensitive moment in it. The offer must be managed actively from the moment the client confirms intent to the moment the candidate accepts in writing. Passive offer management produces fall-throughs.

**Why This Matters**
More placements are lost at offer stage than at any other point in the process. Counter-offers, competing offers, last-minute cold feet, and poorly timed or structured offers from clients all create risk that a well-managed offer process can reduce significantly.

## What to Confirm Before Advising a Client to Extend an Offer
Before telling a client to move to offer, confirm the following with the candidate: they are still enthusiastic about the role; their package expectation has not changed since screening; they do not have other competing offers at a stage where timing is critical; and counter-offer risk has been explored. If any of these are uncertain, resolve them before the offer is extended.

## How to Present an Offer
Call the candidate — do not send the offer and wait. Walk them through it: "The offer is X total cost to company, structured as base plus annual bonus of Y, with Z other benefits. This is what you told me you were looking for." Give them the space to respond. Do not rush to a yes. If their first response is hesitation, ask what specifically is causing it.

## What to Do in the First 24 Hours After an Offer Is Made
Make sure the candidate has the offer in writing within the same day if possible. Check in within 24 hours — not to pressure, but to answer questions, confirm they have had time to review, and assess whether anything has changed. The first 24 hours after an offer is when counter-offers most commonly arrive and when most fall-throughs begin.

## Timelines
Agree a deadline with the client for the candidate's response. Three to five business days is standard. If the candidate needs longer, negotiate this with the client explicitly — do not just let time pass.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$offer-management$$),
  $$8.2$$,
  $$Counteroffer Risk Management$$,
  $$counteroffer-risk-management$$,
  $$**The Standard**
Counter-offer risk is assessed at screening, monitored throughout the process, and directly addressed before an offer is made. Discovering counter-offer risk after an acceptance is a process failure.

**Why This Matters**
Counter-offers are the single largest source of placement fallthrough in the South African recruitment market. They are almost always predictable. A candidate who is highly valued by their current employer, who has a purely financial motivation for moving, and who has not told their manager they are considering leaving is a counter-offer risk that should be documented at screening and managed throughout. Many recruiters avoid this conversation because it is uncomfortable. That discomfort is nothing compared to the commercial and relational cost of a placement that reverses in the first week.

## How to Assess Counter-Offer Probability During Screening
Ask directly: "How does your current employer value you? Have you had any increases or promotions in the last 12 months? Have you spoken to your manager about your career goals?" A candidate who is highly valued, recently promoted, and has not disclosed their job search is a high counter-offer risk regardless of how enthusiastic they seem.

## Signals Indicating High Risk
Money is the primary stated motivation for the move. The candidate has never resigned before. The candidate has a close relationship with their direct manager. The candidate has repeatedly said "I just want more money" without any secondary motivation. The candidate seems uncertain about leaving even as they progress through the process.

## How to Pre-Handle Before It Happens
Have the conversation early: "Counter-offers are common in this market and I want us to think about how you would handle one before we get to offer stage. What would your current employer need to offer for you to consider staying?" A candidate who has thought about this in advance is much less likely to be derailed by it in the moment.

## What to Do When a Counter-Offer Arrives
Do not panic. Call the candidate. Ask what the counter-offer is and what is driving the temptation. Reconnect them with the original reasons they decided to explore a new opportunity — use their own words from the screening call. Do not pressure. If the counter-offer meets their original stated motivation better than your client's offer does, acknowledge it.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$offer-management$$),
  $$8.3$$,
  $$Resignation Support$$,
  $$resignation-support$$,
  $$**The Standard**
The recruiter prepares every candidate for their resignation conversation before it happens. An unprepared resignation is a high-risk event. Preparation does not guarantee a smooth exit, but its absence almost guarantees problems.

**Why This Matters**
The resignation conversation is the moment the counter-offer arrives, the emotional weight of the change becomes real, and the candidate is most vulnerable to staying. A recruiter who has done nothing to prepare the candidate for this moment is handing the employer the advantage.

## How to Prepare a Candidate for Resignation
Brief the candidate before they resign: what to say, how to handle push-back, what a counter-offer looks like in practice, and why people who accept counter-offers typically leave within six to twelve months anyway. Help them choose the timing — Monday or Tuesday mornings are generally better than Fridays.

## What a Resignation Conversation Looks Like
The candidate gives notice calmly and professionally, acknowledges the opportunity the employer has given them, and states their decision clearly without opening the door to negotiation. "I have accepted another opportunity and my last day will be X. I am grateful for the experience here and I want to support a smooth handover." That is it.

## How to Support Through Notice Period
Check in weekly during the notice period. Not daily — that creates anxiety. Weekly is enough to catch problems before they become fallthrough events. Common risks during notice period: the employer escalates the counter-offer, the hiring manager changes, the candidate starts to second-guess the decision, or a personal circumstance changes.

## What Can Go Wrong
Resignation conversation goes badly and the employer becomes hostile, triggering emotional guilt in the candidate. The candidate accepts a counter-offer and calls to say they are staying. The manager convinces them to defer the start date, which then keeps moving. All of these require immediate contact with both candidate and client.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$offer-management$$),
  $$8.4$$,
  $$Start Date Management$$,
  $$start-date-management$$,
  $$**The Standard**
The start date is confirmed in writing at the point of acceptance and protected throughout the notice period. Any change to the start date is communicated to the client immediately and managed jointly.

**Why This Matters**
A start date that slips — even once — creates doubt in the client's mind about the candidate's commitment. A start date that slips twice often results in the client withdrawing the offer. Protecting the start date is part of the placement, not a post-placement administrative detail.

## Confirming the Start Date
The start date is confirmed between client and candidate at the time of offer acceptance. Both parties must agree in writing. The start date should factor in the candidate's contractual notice period — not their optimistic assumption about when they can leave.

## What to Do if the Start Date Slips
If the notice period is extended by the candidate's current employer, contact the client immediately. Do not wait for the client to follow up. Explain the situation, confirm the candidate's commitment, and agree a revised date. Most clients will accommodate a reasonable extension. What they will not accommodate is finding out from the candidate rather than from Level Up.

## Client Communication During Notice Period
A brief check-in with the client midway through the notice period is standard practice. Confirm the start date is still on track, ask if there is any onboarding preparation that Level Up can support, and maintain the relationship.

## Pre-Start Check-In Standards
Contact the candidate two to three days before their start date to confirm logistics and gauge their mindset. If there are any last-minute concerns, you need to know before day one, not after.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$offer-management$$),
  $$8.5$$,
  $$What to Do When an Offer Falls Through$$,
  $$offer-falls-through$$,
  $$**The Standard**
When an offer falls through, the recruiter responds to client and candidate immediately, documents the root cause honestly, and determines within 48 hours whether to re-open the search and on what basis.

**Why This Matters**
A fallen offer is a significant event — commercially, relationally, and in terms of learning. How it is handled determines whether the client relationship survives, whether the candidate remains a positive participant in your network, and whether the team gets smarter as a result of what went wrong.

## Immediate Response to Client
Call the client within the same day. Do not email. Acknowledge the failure directly: "This has fallen through and I want to be straight with you about what happened." Do not over-explain or make excuses. Offer a clear next step: whether you are going back to pipeline candidates, re-opening the search, or recommending a pause while you assess the brief.

## Immediate Response to Candidate
Call the candidate, regardless of why the offer fell through. If the candidate withdrew, the conversation is a professional close with feedback. If the client withdrew, the conversation requires honesty about why and support in processing what is, for most candidates, an upsetting event.

## Root Cause Analysis
Document what caused the fallthrough: counter-offer, candidate withdrew, client withdrew, start date issue, reference issue, or other. Then ask the harder question: what could Level Up have done differently to prevent this? Was counter-offer risk not assessed adequately? Was the offer extended before candidate commitment was confirmed? Was there a red flag in the screening that was not fully explored?

## Whether and How to Re-Open Search
Re-open with a clear conversation with the client about what changed and what the search should look like going forward. Do not simply restart the same brief. A fallen offer is a signal that something in the process was incomplete.

## Learning from the Failure
Post-fallthrough notes are mandatory. They feed into the team's collective process knowledge and improve future placements. One honest note prevents the same mistake on the next role.$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 9: AI USAGE RULES
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$ai-usage$$),
  $$9.1$$,
  $$How We Use AI at Level Up$$,
  $$how-we-use-ai$$,
  $$**The Standard**
AI is a productivity tool, not a decision-making tool. We use it to accelerate specific tasks — drafting, formatting, summarising, generating first cuts. Every output from AI that reaches a client, candidate, or the system must be reviewed and approved by the recruiter responsible for the work.

**Why This Matters**
AI-generated content is plausible but not always accurate, contextually aware, or commercially appropriate. In recruitment, where precision and trust are the product, unreviewed AI output creates risk. The value of AI is in speed and volume of draft production — the value of the recruiter is in judgment, context, and accountability for what gets used.

## What We Use AI For
Role codification first drafts. CV formatting. Submission snapshot drafts. Screening question generation. Candidate summary drafts. Operating Manual article drafts. These are tasks where AI accelerates production of a usable starting point that a recruiter then improves.

## What We Do Not Use AI For
Candidate assessment decisions. Client relationship management. Feedback to candidates. Any communication where nuance, sensitivity, or relationship context is required. These require human judgment.

## AI Is a Multiplier, Not a Replacement
A recruiter using AI effectively produces better outputs faster than a recruiter not using it. A recruiter relying on AI without reviewing its output produces inaccurate or inappropriate content at speed. Use it to go faster while maintaining the standard — not to bypass the standard.

## Recruiter Accountability
You are accountable for everything that goes out under your name, regardless of whether AI drafted it. "The AI wrote it" is not a defence. Review what AI produces with the same critical eye you would apply to your own first draft.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$ai-usage$$),
  $$9.2$$,
  $$What AI Can and Cannot Do$$,
  $$what-ai-can-and-cannot-do$$,
  $$**The Standard**
AI performs well on structured, language-based tasks with clear inputs. It performs poorly on tasks requiring live context, relational judgment, or nuanced human assessment. Every recruiter must understand this distinction to use AI effectively and safely.

**Why This Matters**
Overestimating AI capability leads to unreviewed outputs causing real harm — a candidate rejection email that misrepresents the client's feedback, a role codification that misses the hiring manager's actual priority, a submission snapshot that is professionally written but factually wrong. Underestimating it means leaving productivity on the table. The right calibration matters.

## Specific Capabilities in a Recruitment Context
AI can: draft structured documents from inputs you provide; reformat content while preserving meaning; generate logical questions based on a role brief; summarise long interview notes; identify surface-level gaps between a CV and a role requirement; produce consistent-quality first drafts quickly.

## Specific Limitations in a Recruitment Context
AI cannot: assess whether a candidate's motivation is genuine; detect inconsistency between what a candidate says and how they say it; know that a specific client's hiring manager has particular biases or preferences; understand why a specific company culture will or will not work for a specific candidate; make a judgment call on risk that requires lived experience in the market.

## Why AI Output Must Always Be Reviewed
AI does not know what it does not know. It will produce a confident-sounding output even when the input was ambiguous or the context was insufficient. In every case, the recruiter must check: is the information factually accurate? Is the tone appropriate? Does it reflect what I actually know about this candidate or client? Would I be comfortable with my name on this?

## Risks of Unreviewed AI Output
Content that misrepresents a candidate's experience. Feedback that uses language inappropriate to the cultural context. Submission snapshots that are generically positive without specificity — which clients find unhelpful and hollow. These are avoidable errors that signal a lack of process rigour.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$ai-usage$$),
  $$9.3$$,
  $$Prompt Library — How to Use It$$,
  $$prompt-library-how-to-use$$,
  $$**The Standard**
The Prompt Library contains approved, tested prompts for standard recruitment tasks. Use the library first before writing a custom prompt. If a library prompt produces poor output, document why before modifying it.

**Why This Matters**
Ad hoc prompts produce inconsistent outputs. The Prompt Library standardises the most common AI tasks so that all team members produce comparable-quality first drafts regardless of AI experience. Consistency in inputs produces consistency in outputs.

## How to Access and Use the Prompt Library
The Prompt Library is accessible from the main dashboard. Each prompt is categorised by workflow stage: role management, candidate assessment, submission, interview, and offer. Select the relevant prompt, fill in the required inputs, and run it. Review the output before using it.

## When to Use Each Prompt Category
Role Management prompts: when opening a role and converting intake to codification. Candidate Assessment prompts: when building a screening question set or drafting a candidate summary. Submission prompts: when drafting a candidate snapshot or formatting a CV. Interview prompts: when building a preparation brief for a candidate. Offer prompts: when drafting an offer summary or counter-offer risk assessment.

## How to Customise Prompts for Specific Roles
The prompts are templates. They perform better when you add specific context: the industry, the level of the role, specific technical requirements, or particular client preferences. Add this context in the designated input fields — do not modify the core prompt structure unless you have Director or Talent Manager sign-off.

## What to Do When a Prompt Produces Poor Output
Document what the output got wrong and why. Bring this to the Talent Manager. Poor output usually means either the inputs were insufficient, the prompt needs refinement, or the task is not appropriate for AI at all. Do not just retry with slightly different wording — investigate the root cause.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$ai-usage$$),
  $$9.4$$,
  $$AI Quality Control Rules$$,
  $$ai-quality-control$$,
  $$**The Standard**
No AI output reaches a client, candidate, or the system without being reviewed by the recruiter responsible for the work. Review is not a skim — it is a critical check against known facts and contextual requirements.

**Why This Matters**
AI quality control is not optional compliance. It is the process that makes AI use safe and commercially sound. Without it, AI in a recruitment context creates exactly the kind of errors — inaccurate, generic, or contextually wrong content — that damage relationships and undermine trust.

## Mandatory Review Before Using AI Output
Before using any AI output, ask: Is every fact in this document accurate? Have I verified this against the source — the CV, the intake form, the screening notes? Is the tone appropriate for this specific client or candidate? Does this reflect what I actually know, or what the AI assumed based on the inputs?

## What to Check
Check for: factual accuracy (dates, titles, company names, claimed achievements); tone (appropriate formality for the context); omissions (things that are true and important that the AI did not include because they were not in the inputs); and assumptions (things the AI stated confidently that are actually uncertain).

## Who Is Responsible
The recruiter whose name is on the output is responsible. There is no shared responsibility between the recruiter and the AI. The AI produced a draft. The recruiter reviewed, approved, and sent it. Full accountability sits with the recruiter.

## What Poor AI Output Looks Like
Generic, non-specific content that could describe any candidate in any role. Plausible-sounding but factually wrong statements. Tone that does not match the relationship (too formal, too casual, too effusive). Missing critical context that was in the inputs but not reflected in the output.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$ai-usage$$),
  $$9.5$$,
  $$When Not to Use AI$$,
  $$when-not-to-use-ai$$,
  $$**The Standard**
There are specific situations in the recruitment workflow where AI introduces more risk than value. These situations require human judgment, contextual sensitivity, or relationship nuance that AI cannot provide. Using AI in these situations is a process error.

**Why This Matters**
The instinct to reach for AI whenever a task involves writing is understandable but wrong. The value of AI is highest on structured, lower-stakes tasks with clear inputs. The value of human judgment is highest in sensitive, ambiguous, or high-context situations. Mixing these up produces AI outputs in situations where they cause real harm.

## Sensitive Candidate Conversations
Do not use AI to draft messages or prepare for conversations involving: a candidate who has been rejected after an emotional process; a candidate managing a difficult personal situation that is affecting their job search; a candidate who has been in a toxic environment and needs honest feedback; a candidate at risk of being counter-offered when the conversation requires genuine connection, not scripted phrases.

## Complex Client Situations
Do not use AI when: a client relationship has broken down and the communication requires careful, considered language; a client has raised a complaint and the response needs to reflect genuine accountability; a client is making demands that Level Up cannot meet and the conversation is a negotiation.

## Judgment Calls Requiring Human Context
Candidate tier assignments when you are genuinely unsure. Decisions about whether to escalate a client issue. Advice to a candidate about whether to accept a specific offer given their personal circumstances. These are judgment calls that sit with you, not with a language model.

## The Principle
When the stakes of getting it wrong are high and the correct answer requires context and judgment that you — and only you — can bring to the situation, do not delegate it to AI. Use your judgment. That is what you are paid for.$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 10: KPI AND PERFORMANCE STANDARDS
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$kpi-performance$$),
  $$10.1$$,
  $$Weekly KPI Expectations$$,
  $$weekly-kpi-expectations$$,
  $$**The Standard**
Every Talent Specialist has weekly activity and output targets. Consistently missing these targets triggers a conversation, not a spreadsheet note. KPIs measure quality of execution, not just volume of activity.

**Why This Matters**
KPIs exist to make performance visible. Without them, recruiters and managers rely on subjective impressions of who is working hard and who is not — which is both inaccurate and unfair. The weekly KPI system creates an objective basis for performance conversations, resource allocation, and coaching.

## Weekly Activity Standards
The specific targets vary by role level and are reviewed quarterly. As a general guide, Talent Specialists are expected to maintain: minimum active candidate conversations across live roles; minimum CV submissions per role in active search; minimum client communication touchpoints per week. These numbers are documented in the KPI tracker and agreed at the start of each quarter.

## What Each KPI Measures and Why
New candidates approached: measures pipeline generation effort. Screening calls completed: measures whether approaches are converting to conversations. Candidates submitted for internal review: measures assessment throughput. Internal reviews approved: measures quality of assessments. Client updates sent: measures relationship management activity.

## Difference Between Hitting Numbers and Delivering Quality
A recruiter who hits every activity number but submits consistently C-tier candidates or produces poor screening notes is not a high performer. The numbers create a floor, not a ceiling. The quality of the work within each number is what determines actual performance.

## What Happens When KPIs Are Consistently Missed
One week below target is not a concern. Two consecutive weeks below target prompts a conversation. Three consecutive weeks triggers a formal performance review. The conversation is honest and specific: what happened, what support is needed, what the expectation is going forward.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$kpi-performance$$),
  $$10.2$$,
  $$How KPIs Are Measured$$,
  $$how-kpis-are-measured$$,
  $$**The Standard**
KPIs are measured from system data where possible, and from self-reported data where not. Self-reported data must be accurate and is subject to spot-check review. Data integrity is a professional standard.

**Why This Matters**
A KPI system that relies on inaccurate self-reporting is not a KPI system — it is a fiction that everyone pretends to believe. Data integrity is non-negotiable because it is the foundation of honest performance conversations. Accurate data, even when it reflects poor performance, is more useful than inflated data that prevents a real conversation from happening.

## Data Sources
The primary data source is the Level Up operating system. System-generated data includes: candidates created, assessments completed, internal reviews submitted and approved, roles opened and closed, placements logged. These cannot be manually manipulated and form the baseline for all KPI reporting.

## Who Measures What
Talent Specialists self-report on activities not yet captured by the system (client call frequency, LinkedIn outreach volume). Talent Managers review and validate these reports weekly. Directors review aggregate performance data monthly.

## How the Tracker Is Used
The KPI tracker is reviewed in the weekly team meeting. Each recruiter presents their numbers and a brief commentary — not a defence, but context. What is working, what is not, what they are doing differently next week. The goal is shared learning, not public shaming.

## Self-Reported vs System-Generated Data
When system data and self-reported data diverge, the conversation starts from the system data. "The system shows two screening calls this week, but your report shows five — help me understand the difference." This is not accusatory — it is a data quality conversation that everyone should be able to have comfortably.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$kpi-performance$$),
  $$10.3$$,
  $$Weekly Self-Review Process$$,
  $$weekly-self-review-process$$,
  $$**The Standard**
Every Talent Specialist completes a weekly self-review in the system before the weekly team meeting. The self-review is honest, specific, and used as the basis for a coaching conversation — not a compliance exercise submitted and never read.

**Why This Matters**
Self-review is one of the most underused tools in recruitment management. Done properly, it makes recruiters reflect on what is working, what is not, and what they need — before those problems have compounded to a point where they require a serious conversation. Done as a compliance exercise, it produces useless data and a false sense of oversight.

## Purpose of Weekly Self-Review
The self-review captures: what the recruiter worked on that week; what went well and specifically why; what did not go well and the honest reason; what they need from the Talent Manager this week; and their plan for the following week.

## How to Complete It Honestly
The temptation is to frame everything positively to avoid a difficult conversation. Resist this. The self-review is only useful if it reflects reality. A recruiter who consistently writes honest self-reviews that identify their own blockers will receive better coaching and close more roles than one who writes tidy reports that hide problems.

## What Managers Look For
Talent Managers read self-reviews for: accurate diagnosis of where things are stalling; specific requests for support or advice; patterns across weeks that suggest a skill gap or a pipeline problem; and evidence that the recruiter is thinking critically about their own work rather than just reporting activity.

## Useful Self-Review vs Compliance Exercise
A compliance exercise says: "Completed three screenings, sent four client updates, pipeline looks good." A useful self-review says: "Three screenings completed but none were strong enough to submit — common theme was candidates not meeting the seniority requirement. Need to revisit the sourcing profile with the Talent Manager."$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$kpi-performance$$),
  $$10.4$$,
  $$Performance Conversations$$,
  $$performance-conversations$$,
  $$**The Standard**
Performance conversations at Level Up are direct, evidence-based, and focused on what changes next. They are not performance reviews disguised as casual chats, nor are they disciplinary actions disguised as "feedback sessions." Both parties know what the conversation is and what it is for.

**Why This Matters**
Ambiguous performance conversations are common in South African workplaces — and they are useless. The recruiter leaves without knowing clearly what the concern is. The manager leaves without knowing whether the message landed. Both leave without an agreed plan. This protects no one and helps no one improve.

## How Performance Is Discussed at Level Up
Performance concerns are raised as soon as they are identified, not saved for a quarterly review. The conversation covers: what the specific concern is, what the data shows, what the expectation is, and what needs to be different going forward. It is a conversation, not a lecture.

## The Difference Between a Performance Conversation and a Disciplinary
A performance conversation is support-oriented: "Here is what I am seeing, here is why it matters, here is what I think would help." A disciplinary is consequence-oriented and happens when performance conversations have not produced the required change. They are different in tone, format, and purpose. No recruiter should be surprised by a formal disciplinary if performance conversations have been handled correctly.

## How to Prepare
The Talent Manager prepares by: reviewing the recruiter's KPI data for the relevant period, identifying specific examples of the concern, and having a clear view of what "better" looks like and what support is available. The recruiter prepares by reviewing their own self-reviews and being ready to add context to the data.

## What Good Feedback Looks Like From Both Sides
Manager feedback: specific, evidence-based, actionable, non-personal. "Your last three submission notes were missing risk documentation — here is the standard and here is how to correct it" is better than "your assessments need to improve." Recruiter feedback: honest, specific, and not defensive. Receiving feedback is a professional skill.$$
);

insert into public.manual_articles (section_id, article_number, title, slug, content)
values (
  (select id from public.manual_sections where slug = $$kpi-performance$$),
  $$10.5$$,
  $$What Good Performance Looks Like$$,
  $$what-good-performance-looks-like$$,
  $$**The Standard**
High performance at Level Up is not about having the most activity or the loudest presence in a team meeting. It is about consistent execution at a high standard across the whole recruitment lifecycle — intake, sourcing, screening, assessment, submission, and delivery.

**Why This Matters**
Without a clear, practical description of what high performance looks like, performance conversations become vague and subjective. This article defines the behaviours and outputs that separate high performers from average ones at each role level.

## What High Performance Looks Like at Talent Specialist Level
The specialist who consistently performs at the highest level does the following: completes every intake before sourcing; produces screening call notes that are specific and evidence-based; assigns tier with documented justification; submits candidates they can defend under scrutiny; communicates with candidates proactively without being chased; and reviews what went wrong after every failed submission. They are not reactive. They manage their pipeline, they do not let it manage them.

## What High Performance Looks Like at Client Owner Level
The Client Owner who performs at the highest level does the following: knows their clients well enough to advise, not just execute; challenges briefs that are wrong rather than sourcing to them; manages client expectations with facts, not optimism; produces consistent client satisfaction measured in repeat roles and referrals; and holds the quality standard on every submission bearing their client's name.

## Behaviours That Separate Good Recruiters from Great Ones
Great recruiters ask questions when other recruiters make assumptions. They probe candidate motivation rather than accepting the first answer. They read client signals others miss. They can say "I do not know, but I will find out" without it feeling like a weakness. They treat the system as a tool that makes them better, not a constraint that slows them down.

## What the Team Expects of Each Other
Honesty about what is working and what is not. Proactive communication about problems before they escalate. Help when a colleague is stuck, without drama or ego. Feedback given directly and received without defensiveness. A shared standard of professionalism that makes Level Up worth recommending.$$
);
