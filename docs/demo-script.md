# Lasers2Uni Demo Script

Target length: about 2 minutes 30 seconds.

## Setup Before Judges Arrive

- Open the app fresh on the onboarding screen.
- If Ollama is live, verify `js/ai.js` points to your local model and `ollama serve` is running.
- If Supabase is live, verify the realtime toast works and the `outcomes` table is reachable.
- Keep one helper ready to submit the outcome from another browser tab or device during the dashboard moment.

## Word-for-Word Script

### 1. Onboarding

Speaker:

> Transfer students usually get overwhelmed because college advice is scattered across counselors, articulation websites, and Reddit threads. So we built Lasers2Uni, a transfer-school finder made specifically for students at Irvine Valley College.

Click:

- Enter `Alex`.
- Select `Computer Science`.
- Click `Next`.

Speaker:

> I’m going to fill this out as Alex Chen, an IVC computer science student with a 3.6 GPA who’s actively in Honors.

Click:

- Set GPA to `3.60`.
- Select `45–60`.
- Select `In Progress` for IGETC.
- Select `Yes — actively enrolled` for Honors.
- Click `Next`.

Speaker:

> We capture the details that actually matter for transfer: academics, IGETC, Honors, career goals, and what kind of campus the student wants.

Click:

- Career goals: `I want to build AI products, get a software internship after transfer, and maybe start a company later.`
- Industries: `Tech / Software`, `Startups / Entrepreneurship`
- Grad: `Maybe someday`
- Click `Next`

Click:

- Size: `Large`
- Region: `SoCal`
- Priorities: `Industry connections`, `Prestige / rankings`, `Staying close to home`
- Extra: `I would love to transfer to UCI if possible.`
- Click `Find My Schools`

### 2. Swiping

Speaker:

> Then instead of dumping students into a spreadsheet, we make discovery feel intuitive. They swipe through schools the same way they already evaluate choices in real life.

Click quickly:

- Like `UCI`
- Like `UCLA`
- Like `UCSD`
- Pass `ASU`
- Pass `University of Oregon`
- Like `Cal Poly Pomona` or `CSULB`
- Click `Done swiping → See my results`

### 3. Loading Screen

Speaker:

> Once Alex finishes swiping, our AI takes the full student profile plus their selected school tiers and generates a personalized transfer plan. It’s not just ranking schools. It’s writing school-specific advice, required prep, IVC pathway notes, and a long-term career roadmap.

### 4. Schools Tab

Speaker:

> Here’s the result. The dashboard organizes schools into reach, match, and safety, and each one has advice tailored to the student we just entered.

Click:

- Expand `UC Irvine`

Speaker:

> This is the moment we want students to feel: not generic college advice, but IVC-specific guidance. For Alex, it calls out the Honors-to-UCI pathway and explains how that local transfer advantage changes the strategy.

Pause on:

- `Admission Tips`
- `IVC Pathway`
- `Portfolio Projects to Build`

Speaker:

> It also suggests concrete portfolio projects that match computer science and Alex’s AI startup goals, so the student leaves with an actual next step.

### 5. Life Plan Tab

Click:

- Open `Life Plan`

Speaker:

> And we don’t stop at admission. The Life Plan tab turns the transfer decision into a career roadmap, starting at IVC, then through transfer, recruiting, and the first few years after graduation.

Pause on:

- Summary
- Timeline
- Job Strategy

Speaker:

> So instead of just asking “Where can I get in?”, students can ask, “Which path gets me where I want to go?”

### 6. Live Database Moment

Speaker:

> The really exciting part is that this gets smarter over time.

Click:

- Click `Report Your Acceptance`

Speaker:

> If a real IVC student gets into a school, they can log that outcome.

Action:

- Either submit from the modal live, or have a teammate submit from another tab/device.
- Best demo entry: `Alex Chen`, `Computer Science`, `3.6`, `UC Irvine`

Speaker while toast appears:

> That acceptance is written to our live database in real time. Judges can literally watch the outcomes feed update as new transfer results come in.

### 7. Vision Close

Speaker:

> Today, Lasers2Uni helps one IVC student make a better transfer decision. Tomorrow, every student outcome becomes training data for the next student, so the guidance keeps getting sharper, more local, and more trustworthy over time.

> We’re turning transfer from a guessing game into a feedback loop. That’s Lasers2Uni.

## Pace Notes

- Keep the onboarding brisk: around 40-50 seconds.
- Spend the most time on the UCI expansion and Life Plan tab.
- The closing vision should be confident and short.

## Backup Lines If Something Breaks

- If Ollama is slow: `The loading step is where we generate the personalized transfer plan from the student profile and school preferences.`
- If realtime does not fire: `This action writes to our outcomes table, and in the full live flow that update appears instantly for everyone watching.`
- If the API is offline and fallback content appears: `We also built a graceful fallback so the student still gets a full dashboard instead of a blank screen.`
