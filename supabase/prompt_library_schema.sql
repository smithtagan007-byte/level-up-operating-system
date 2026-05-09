-- Prompt Library Schema

create table public.prompts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  purpose text not null,
  when_to_use text not null,
  prompt_text text not null,
  required_inputs text,
  expected_output text,
  example_output text,
  version int not null default 1,
  approved_by uuid references public.user_profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.prompts enable row level security;

create policy "Authenticated users read active prompts"
  on public.prompts for select
  using (auth.uid() is not null and is_active = true);

create policy "Managers manage prompts"
  on public.prompts for all
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid()
      and role in ('talent_manager', 'director')
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid()
      and role in ('talent_manager', 'director')
    )
  );

-- ─── Seed Data ────────────────────────────────────────────────────────────────

insert into public.prompts (name, category, purpose, when_to_use, prompt_text, required_inputs, expected_output)
values (
  $$Role Codification$$,
  $$Role Intelligence$$,
  $$Transform a completed role intake into a structured intelligence brief that guides sourcing, screening, and candidate assessment.$$,
  $$After role intake is complete, before sourcing begins. Do not begin searching until this brief exists.$$,
  $$You are a specialist recruitment consultant helping to codify a role before sourcing begins.

I will provide you with the role intake details below. Your task is to produce a structured Role Intelligence Brief that will guide sourcing, screening, and candidate assessment for this search.

**Role Details:**
[PASTE ROLE INTAKE INFORMATION HERE]

Please produce a Role Intelligence Brief with the following sections:

**1. Role Summary**
One paragraph describing what this person actually does day-to-day. Not the job title — what they wake up and do. What problems they solve. Who they interact with.

**2. Must-Have Criteria**
The non-negotiable requirements. If a candidate does not have these, they must not be progressed. Maximum 5 items. Be precise — "5+ years in financial services" is better than "relevant experience".

**3. Strong-to-Have Criteria**
Attributes that significantly strengthen a candidate but are not blockers. Maximum 5 items.

**4. Red Flags to Screen Out**
Specific signals in a CV or screening call that should disqualify a candidate for this role. Think: wrong trajectory, wrong culture, wrong level, wrong industry.

**5. Ideal Candidate Profile**
A paragraph describing the type of person who will thrive in this role. Include: career stage, working style, personality traits, what they find motivating, and what kind of environment they come from.

**6. Sourcing Strategy**
Where to find this person. Include:
- Job titles to search (including adjacent titles)
- Target companies and sectors
- LinkedIn boolean search string
- Talent pool size estimate (shallow / moderate / deep)

**7. Screening Questions**
5 questions to validate the must-have criteria in a screening call. Each question must be specific enough that a candidate without the experience cannot bluff their way through.

**8. Compensation Sense Check**
Based on the salary range provided, is this competitive for this role in this market? If not, flag what the realistic range is and what compromises may be needed.

**9. Candidate Objections**
What might strong candidates find unappealing about this role? How should we address each objection proactively in our approach and screening?

Be direct and specific. Generic advice is not useful. This brief will be used by the delivery recruiter to run the search.$$,
  $$Role intake form details: client name, job title, key responsibilities, must-have requirements, nice-to-have requirements, salary range, start date, team context, reporting line, reason for hire.$$,
  $$Structured Role Intelligence Brief covering: role summary, must-haves, nice-to-haves, red flags, ideal candidate profile, sourcing strategy with LinkedIn search string, 5 screening questions, compensation sense check, and candidate objections with suggested responses.$$
);

insert into public.prompts (name, category, purpose, when_to_use, prompt_text, required_inputs, expected_output)
values (
  $$Candidate CV Review$$,
  $$Candidate Assessment$$,
  $$Evaluate a candidate CV against a specific role and produce a tier rating with evidence-backed strengths and risks.$$,
  $$When reviewing a candidate CV against a live role, before deciding whether to invite them to a screening call.$$,
  $$You are an experienced specialist recruitment consultant reviewing a candidate CV against a specific role.

**Role Details:**
[PASTE: Role title, must-have criteria (list each one), and salary range]

**Candidate CV:**
[PASTE FULL CV TEXT HERE]

Review this candidate and provide a structured assessment:

**1. Tier Rating**
Rate the candidate using this system:
- A = Exceptional — strong on all must-haves, compelling profile, submit with confidence
- B = Strong — meets must-haves, one or two gaps, worth screening
- C = Viable — meets most must-haves, notable gaps, screen only if pipeline is thin
- D = Weak — significant gaps, do not progress
- Reject = Does not meet minimum criteria, do not contact

State the tier first, then justify it in two sentences.

**2. Must-Have Assessment**
Go through each must-have criterion individually. For each one: state whether the candidate meets it (Yes / Partial / No) and cite the specific evidence from their CV.

**3. Strengths**
3–5 genuine strengths that are directly relevant to this role. Cite specific evidence — job titles, companies, achievements, tenure.

**4. Concerns**
Be direct. List every concern, gap, or risk you can identify. Do not soften concerns to make the candidate seem more attractive. A concern you miss wastes the client's time and damages trust.

**5. Career Trajectory**
Is this person moving in the right direction? Are there unexplained gaps, short tenures, or lateral moves that need probing? What story does their career tell?

**6. Compensation Fit**
Based on their current or most recent compensation (if visible), are they likely to fit within the role's budget? Flag any risk.

**7. Recommended Next Step**
Should we screen this candidate? If yes: what is the single most important thing to validate in the call? If no: brief reason why not.$$,
  $$Role title, must-have criteria (list each), salary range, and the candidate's full CV text.$$,
  $$Tier rating (A/B/C/D/Reject) with justification, must-have assessment with evidence, 3–5 strengths, list of concerns, career trajectory analysis, compensation fit assessment, and a recommended next step.$$
);

insert into public.prompts (name, category, purpose, when_to_use, prompt_text, required_inputs, expected_output)
values (
  $$Shortlist Ranking$$,
  $$Candidate Assessment$$,
  $$Rank a screened shortlist of candidates for one role and produce a clear submission recommendation.$$,
  $$After screening 3 or more candidates for one role, before the internal review meeting and before deciding who to submit to the client.$$,
  $$You are a specialist recruitment consultant helping to rank a screened shortlist for a single role.

**Role Details:**
[PASTE: Role title, client name, must-have criteria, salary range, and ideal candidate profile]

**Shortlisted Candidates:**
[For each candidate, paste: Name, current role and company, tier rating from CV review, key screening notes (strengths, concerns, motivations, salary expectations, notice period)]

Produce a ranked shortlist and submission recommendation:

**1. Ranked Order**
List all candidates from strongest to weakest. Next to each name, one sentence justifying their position.

**2. Top Pick Rationale**
A paragraph explaining why Candidate #1 is the strongest option. Connect their specific background to what the client needs. This is your recommendation — own it.

**3. Decision Matrix**
A table: candidates as rows, must-have criteria as columns. Use:
✓ = Meets criterion
~ = Partially meets
✗ = Does not meet

**4. Differentiators**
Where candidates are close in ranking, what is the deciding factor? Be specific.

**5. Risks by Candidate**
For each candidate in the top 3: the single biggest risk if we progress them and how we would mitigate it.

**6. Submission Recommendation**
How many candidates should we submit? Which ones? If you are recommending fewer than the client requested, explain why submitting a weaker candidate would not serve the client.

**7. Compensation Summary**
Salary expectations for each candidate in the top 3. Flag any that are outside the client's stated range.$$,
  $$Role title, client name, must-have criteria, salary range, ideal candidate profile, and for each candidate: name, current role, tier rating from CV review, and screening notes.$$,
  $$Ranked shortlist with justifications, decision matrix, top pick rationale, per-candidate risk assessment, submission recommendation, and compensation summary.$$
);

insert into public.prompts (name, category, purpose, when_to_use, prompt_text, required_inputs, expected_output)
values (
  $$Screening Question Generator$$,
  $$Screening$$,
  $$Build a structured, role-specific screening call guide that validates must-have criteria and uncovers candidate motivation.$$,
  $$Before every candidate screening call. This must be completed as part of call preparation — do not screen without a guide.$$,
  $$You are a specialist recruitment consultant preparing for a candidate screening call.

**Role Details:**
[PASTE: Role title, must-have criteria, key concerns from CV review]

**Candidate Background:**
[PASTE: Current role and company, relevant experience, any red flags or gaps identified in CV review]

Generate a structured screening call guide:

**1. Opening Script**
A 2–3 sentence opening to start the call professionally, introduce the role context, and set the agenda. Tone: warm but purposeful.

**2. Must-Have Validation Questions**
One specific question per must-have criterion. Each question must:
- Be impossible to answer well without the actual experience
- Probe depth, not just surface familiarity
- Have a follow-up prompt if the answer is vague

**3. Motivational Questions**
3 questions to understand:
- Why they are open to a move right now
- What they are looking for in their next role
- Whether this specific role genuinely aligns with what they want (not just what they'll accept)

**4. Red Flag Probes**
Questions to investigate the specific concerns from the CV review. For each concern: the question to ask, and what a good vs. concerning answer looks like.

**5. Compensation Alignment**
A natural, non-awkward way to confirm salary expectations and notice period — without leading with money and without being vague.

**6. Candidate Questions**
What strong, well-prepared candidates typically ask at this stage. How to answer each one in a way that keeps them engaged without over-promising.

**7. Call Scorecard**
The 3 things you must have confirmed before ending the call. If any of these are unresolved, the candidate cannot progress.$$,
  $$Role title, must-have criteria, key concerns from CV review, candidate's current role and company, and any red flags or gaps noted during the CV review.$$,
  $$Structured call guide including opening script, must-have validation questions, motivational questions, red flag probes, compensation conversation script, candidate question responses, and a 3-point call scorecard.$$
);

insert into public.prompts (name, category, purpose, when_to_use, prompt_text, required_inputs, expected_output)
values (
  $$Final Candidate Assessment$$,
  $$Candidate Assessment$$,
  $$Write a complete internal review submission document for a screened candidate, ready for Talent Manager sign-off.$$,
  $$After completing a screening call, before submitting the candidate for internal review. This document replaces informal notes — it must contain evidence for every claim.$$,
  $$You are a specialist recruitment consultant writing a final candidate assessment for internal review.

**Role Details:**
[PASTE: Role title, client name, must-have criteria, salary range]

**Screening Notes:**
[PASTE: Your full screening call notes — answers to each question, observations, instincts, anything that stood out]

**CV Summary:**
[PASTE: Key points from the CV, or the full CV text]

Write a structured Final Candidate Assessment for internal review. This document will be read by the Talent Manager before approving submission to the client.

**1. Tier Rating**
State: A / B / C / D / Reject. Justify in one sentence. This is your professional recommendation — be decisive.

**2. Evidence Summary**
For each must-have criterion:
- What did the candidate say? (direct quote or paraphrase from screening)
- Is this validated or claimed? (validated = you probed it; claimed = they stated it without evidence)
- Your confidence level: High / Medium / Low

**3. Strengths**
3–5 specific, evidence-backed strengths relevant to this role. Each must reference what the candidate said or demonstrated — not what you hope is true.

**4. Risks**
List every risk you have identified — from CV, screening, or gut instinct. For each risk:
- Describe the risk
- Rate it: Low / Medium / High / Critical
- State how it was or was not mitigated in the screening call

Do not omit risks because you like the candidate. The Talent Manager needs the full picture.

**5. Motivational Alignment**
Why is this person open to a move? Does this role genuinely solve their problem, or are they just exploring options? How committed are they to this process?

**6. Compensation**
Confirmed salary expectations. Is there a gap vs. the client's budget? If so, what is the plan?

**7. Cultural Fit**
Based on your conversation, will this person thrive in this client's environment? What signals support this?

**8. Recommendation to Talent Manager**
Your clear recommendation: approve for submission, hold pending further validation, or do not progress. If hold or do not progress, state exactly what would need to change.$$,
  $$Role title, client name, must-have criteria, salary range, full screening call notes (answers to all questions, observations, instincts), and CV key points or full text.$$,
  $$Complete internal review document: tier rating, evidence summary per must-have, 3–5 strengths with evidence, full risk log with ratings, motivational alignment assessment, compensation confirmation, cultural fit indicators, and a recommendation to the Talent Manager.$$
);

insert into public.prompts (name, category, purpose, when_to_use, prompt_text, required_inputs, expected_output)
values (
  $$Client Submission Summary$$,
  $$Client Management$$,
  $$Write a professional candidate submission summary to accompany the formatted CV when presenting to a client.$$,
  $$After internal review approval, when preparing the candidate submission pack for the client. Every submission must include this summary.$$,
  $$You are a specialist recruitment consultant writing a candidate submission summary for a client.

**Role:** [ROLE TITLE] at [CLIENT NAME]

**Client Context:**
[PASTE: The client's key requirements, what they emphasised in the brief, their pain points, any specific preferences they mentioned]

**Candidate Details:**
[PASTE: Full name, current role and company, current salary, salary expectation, notice period, location]

**Internal Assessment:**
[PASTE: Tier rating, top 3 strengths, any risks the client should be aware of, key screening insights]

Write a professional candidate submission summary. This will be read by the hiring manager alongside the formatted CV.

**Structure:**

**Opening paragraph — "Why This Candidate"**
Connect this candidate's specific background directly to what the client said they need. Not generic praise — specific linkage. Maximum 4 sentences.

**Candidate Profile**
- Current role, company, and tenure
- 3–5 bullet points of the most relevant experience and achievements for this role
- One line on career trajectory (where they've come from and where they're heading)

**What They're Looking For**
1–2 sentences on why they are open to a move and what attracts them to this specific opportunity. This validates that the candidate is genuinely interested — not just a warm body.

**Compensation & Availability**
- Current package: [amount]
- Expectation: [amount]
- Notice period: [period]
- Available from: [date if known]

**Recommended Next Step**
A brief sentence on what you recommend: first interview, introductory call, or direct to panel. Include your availability to facilitate.

Tone: confident, concise, professional. No filler. The client is reading 10 CVs — make this one stand out. Maximum 350 words.$$,
  $$Role title, client name, client's key requirements and pain points, candidate name and contact details, current and expected salary, notice period, tier rating, top 3 strengths, and key screening insights.$$,
  $$Professional 300–350 word submission summary including a "Why This Candidate" opening, structured profile with 3–5 bullet points, motivation statement, compensation and availability details, and a recommended next step.$$
);

insert into public.prompts (name, category, purpose, when_to_use, prompt_text, required_inputs, expected_output)
values (
  $$Interview Preparation Brief$$,
  $$Interview$$,
  $$Produce a full interview preparation brief for a candidate ahead of a client interview.$$,
  $$Before every client interview. Must be sent to the candidate a minimum of 24 hours in advance. Do not let a candidate walk into an interview without this.$$,
  $$You are a specialist recruitment consultant preparing a candidate for a client interview.

**Role:** [ROLE TITLE] at [CLIENT NAME]
**Interview Stage:** [e.g., First interview with hiring manager / Technical panel / Final with MD / Informal coffee]
**Interview Format:** [e.g., Competency-based / Case study / Technical assessment / Informal discussion]
**Interviewer(s):** [Names and titles if known]

**Client Context:**
[PASTE: What the client cares about most, their culture, any feedback from previous stages if applicable, anything specific the client mentioned about what they're looking for]

**Candidate Profile:**
[PASTE: Name, current role, key strengths from assessment, any known gaps or concerns to be addressed]

Produce a complete Interview Preparation Brief for the candidate:

**1. What to Expect**
Describe the interview format, likely tone, and focus areas based on what you know about this client and stage. Help the candidate know what kind of conversation this will be.

**2. Key Themes to Communicate**
3–4 specific messages this candidate must land in this interview — not generic "be yourself" advice, but the precise things that will resonate with this interviewer based on the brief.

**3. Likely Questions & How to Answer**
6–8 questions this interviewer is likely to ask, with guidance on how to answer each effectively. For each:
- The question
- What the interviewer is really assessing
- How this candidate should answer it (connecting their specific experience to what the client wants)

**4. Strong Questions to Ask**
4–5 questions the candidate should ask the interviewer. These should demonstrate commercial awareness, genuine interest, and preparation — not basic questions they could Google.

**5. Watch-Outs**
What NOT to say or do in this interview, based on what you know about this client's culture and preferences.

**6. Logistics**
Arrival time (arrive 10 minutes early), dress code, what to bring, who to ask for, any access or building instructions.

**7. After the Interview**
The candidate should call you within 30 minutes of leaving the building to debrief. Explain what you need from them: their gut reaction, what went well, what questions they found difficult, their level of interest.$$,
  $$Role title, client name, interview stage and format, interviewer names and titles, what the client cares about most, any feedback from previous stages, and candidate name with key strengths and known gaps.$$,
  $$Complete interview preparation brief: what to expect, 3–4 key themes to communicate, 6–8 likely questions with tailored guidance, 4–5 strong questions to ask, watch-outs, logistics, and post-interview debrief instructions.$$
);

insert into public.prompts (name, category, purpose, when_to_use, prompt_text, required_inputs, expected_output)
values (
  $$Offer Risk Assessment$$,
  $$Offer Management$$,
  $$Assess the risk profile of a placement before an offer is extended, and produce specific protective actions.$$,
  $$Before advising a client to extend an offer. Must be completed for every placement — no offer should be made without this assessment on file.$$,
  $$You are a specialist recruitment consultant assessing the risk of an offer situation before it is extended.

**Role:** [ROLE TITLE] at [CLIENT NAME]
**Offer Details:**
[PASTE: Proposed base salary, bonus structure, benefits, start date, any special conditions or constraints]

**Candidate Situation:**
[PASTE: Current compensation (base + total package), notice period, any competing processes (stage, company, likelihood), counter-offer history if known, stated motivations for moving]

**Process Context:**
[PASTE: Number of interview stages completed, length of process (weeks), candidate's engagement level throughout, any hesitations or signals of cooling interest, reference check status]

Produce an Offer Risk Assessment:

**1. Offer vs. Expectation**
Does this offer meet, exceed, or fall short of what the candidate confirmed during screening? If there is a gap: how significant is it, and is it bridgeable?

**2. Counter-Offer Risk**
How likely is a counter-offer from the current employer? Rate: Low / Medium / High.
What signals are present that inform this rating? What should we do if one arrives?

**3. Competing Offer Risk**
Are there other processes running? How advanced? Rate: Low / Medium / High.
If a competing offer arrives: how do we advise the candidate? What is our leverage?

**4. Motivation Integrity Check**
Are the candidate's stated reasons for moving still valid and present? Is there any signal that their motivation has changed since screening? Would this offer genuinely solve the problem they described?

**5. Resignation Risk**
How confident are we that the candidate will resign successfully and work out their notice? What could derail this between offer acceptance and start date?

**6. Overall Risk Rating**
Low / Medium / High / Critical. One paragraph justifying this rating with the key factors.

**7. Recommended Actions**
Specific steps to take before, during, and after the offer is extended to protect the placement. Assign each action to a responsible party (consultant, candidate, or client).$$,
  $$Proposed offer details (salary, bonus, benefits, start date), candidate's current compensation and notice period, any competing processes and their status, counter-offer history, candidate's stated motivations, and a summary of the process (stages, duration, engagement level).$$,
  $$Full offer risk assessment: offer vs. expectation analysis, counter-offer risk rating with signals, competing offer risk rating, motivation integrity check, resignation risk assessment, overall risk rating (Low/Medium/High/Critical), and specific recommended actions with owners.$$
);

insert into public.prompts (name, category, purpose, when_to_use, prompt_text, required_inputs, expected_output)
values (
  $$Rejection Feedback Script$$,
  $$Candidate Management$$,
  $$Prepare a structured, honest feedback script for an unsuccessful candidate that is specific, constructive, and professional.$$,
  $$When delivering rejection feedback at any stage — CV not progressed, post-screening, or post-interview. Every rejected candidate deserves a proper feedback call.$$,
  $$You are a specialist recruitment consultant preparing to give feedback to an unsuccessful candidate.

**Role:** [ROLE TITLE] at [CLIENT NAME]
**Stage Reached:** [e.g., CV not progressed / Post-screening, before internal review / Post-first interview / Post-final interview]

**Reason for Rejection:**
[PASTE: The actual reason. Be specific. e.g., "Client felt candidate lacked experience managing teams above 5 people" or "Salary expectation is 35% above the client's budget and cannot be bridged" or "Strong candidate but another candidate had directly relevant sector experience"]

**Candidate Profile:**
[PASTE: Name, current role, what they were genuinely strong on, what the gap was]

**Future Potential:**
[Is this candidate one we want to maintain a relationship with for future roles? Yes / No / Maybe]

Write a feedback call script:

**1. Opening**
2–3 sentences to open the call with warmth and acknowledge their time and engagement.

**2. The Feedback**
Deliver the specific, honest feedback. This is the hardest part — do not generalise. Name the actual gap. Where the feedback is from the client directly, attribute it appropriately. Where the gap is structural (e.g., budget), explain it clearly.

**3. Contextualising the Feedback**
Where relevant: put the feedback in context so the candidate can learn from it rather than just feel rejected. What does this mean for their job search more broadly?

**4. Constructive Development Points**
If there is something the candidate can do to improve their candidacy for similar roles in future — say it specifically. Only include this if it is genuinely actionable. Do not pad with empty encouragement.

**5. The Forward-Looking Close**
If this is a candidate worth keeping in our network: express this genuinely and specifically. Tell them what type of role or timing would be a better fit. If this is not a candidate we want to maintain a relationship with, close professionally and warmly without making false promises.

Keep the total script under 3 minutes to deliver. This is a human conversation — not a performance review.$$,
  $$Role title, stage reached, actual reason for rejection (specific), candidate name and current role, their genuine strengths, the core gap, and whether we want to maintain a relationship with them for future roles.$$,
  $$Structured feedback call script (under 3 minutes): opening acknowledgement, specific honest feedback with context, constructive development points (if applicable), and a forward-looking close appropriate to whether we want to maintain the relationship.$$
);

insert into public.prompts (name, category, purpose, when_to_use, prompt_text, required_inputs, expected_output)
values (
  $$Market Mapping Brief$$,
  $$Business Development$$,
  $$Build a market intelligence brief for entering a new talent market or vertical — for client pitches, desk-building, or new search strategy.$$,
  $$When researching a new market, preparing a speculative client pitch, planning a new search desk, or approaching a market you have not worked in before.$$,
  $$You are a specialist recruitment consultant conducting a market mapping exercise for a new target market.

**Target Market:**
[PASTE: Function + Seniority + Industry + Geography. e.g., "Chief Financial Officers in South African FinTech" or "Senior Salesforce Architects in Cape Town" or "Head of Procurement, manufacturing sector, Gauteng"]

**Business Context:**
[PASTE: Why are we entering this market? Do we have a specific client brief or is this speculative business development? What do we already know or have relationships in this space?]

Produce a Market Intelligence Brief:

**1. Market Overview**
Size and shape of this talent pool in the specified geography. Is this a deep, moderate, or shallow pool? What does supply vs. demand look like? Is this a candidate-driven or employer-driven market right now?

**2. Target Job Titles**
The actual job titles we should be searching. Include common variations, seniority-level differences, and any titles that are unique to specific industries or company types.

**3. Target Companies**
The types of companies where this talent sits. Name specific companies in the South African context where possible. Which companies are likely to be net exporters of talent (good sourcing targets) vs. strong employers who retain people (harder to pull from)?

**4. Talent Mobility**
How mobile is this talent pool? What are typical notice periods? What is the churn rate — are people moving frequently or staying for years? What life events typically trigger a move?

**5. Compensation Benchmarks**
Typical salary ranges by level for this market in South Africa. Flag if compensation is highly variable by company type (e.g., listed vs. private, financial services vs. tech). Include total package components that are typical for this market.

**6. Hiring Drivers**
What motivates people in this market to move? What do they care about beyond salary — leadership, growth, brand, work model, sector prestige? What are the common push factors from current employers?

**7. Candidate Objections**
What will these candidates say when we approach them cold? How should we handle the most common objections — "I'm happy where I am", "I'm not looking", "who are Level Up?"

**8. Sourcing Channels**
Where does this talent spend time? LinkedIn activity level. Professional associations or bodies. Events and conferences. Online communities or forums. Any non-LinkedIn sourcing channels that work in this market.

**9. Competitive Landscape**
Which recruitment firms currently own this space in South Africa? What is their positioning? Where is the gap that Level Up can exploit?

**10. Recommended Entry Strategy**
If this is speculative: who should we approach first and in what order? What is the conversation — a speculative approach, a market update, a benchmark call? What is our hook?$$,
  $$Target market definition (function + seniority + industry + geography) and business context (why we're entering this market, any existing client brief or relationships, what we already know).$$,
  $$Comprehensive market intelligence brief: market overview and depth assessment, target job titles with variations, specific target companies, talent mobility patterns, compensation benchmarks, hiring drivers, candidate objections with responses, sourcing channels, competitive landscape, and recommended entry strategy.$$
);
