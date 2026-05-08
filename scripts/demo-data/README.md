# Demo data seeder — Claude Code only

This folder is intentionally **outside** the deployable Salesforce package
(`force-app/`). It is the home of an SE-only tool to spawn realistic demo
records before a live customer demo.

## How to use

In a Claude Code session at the root of this repo, ask:

> *seed demo data for `<seller>`*

Claude will then run the workflow described below.

## Workflow

1. **Interview (4 questions max)**
   - Who is the seller (the company you're demoing to)?
   - What does it sell (product / service)?
   - What target industries should the demo customers come from?
   - Meeting type and number of scenarios?

2. **WebSearch on the seller** to anchor on real customers, vocabulary, and
   pain points specific to that market. If WebSearch is unavailable, Claude
   falls back to its own knowledge.

3. **Write a one-shot Apex anonymous file** to
   `scripts/demo-data/_runs/<timestamp>-<seller-slug>.apex`. The script:

   - Inserts N `Account` records with **real** plausible customer names of
     the seller's market.
   - Inserts 2 `Contact` per account with French names and titles consistent
     with the industry.
   - Inserts 1 `Demo_Context__c` per scenario with:
     - `Company__c` = seller (the demo company)
     - `Account_Name__c` = real customer name from the seller's market
     - `Industry__c` and `Meeting_Type__c` from the picklists
     - `Pain_Points__c`, `Conversation_Hooks__c`, `Objection_Map__c`,
       `Success_Criteria__c`, `Company_Profile__c` **written by Claude**
       (no Models API call, no Prompt Builder dependency)
   - Inserts 1 future `Event` (J+2/+3/+4) linked to the Account + Contact[0].
     The flow `Auto_Create_Visit_Capture_On_Event` spawns the Visit Capture
     automatically.
   - Updates the spawned Visit Capture with `Demo_Context__c` and a short
     HTML `AI_Visit_Brief__c` written by Claude.
   - Outputs `System.debug` with the created Ids for traceability.

4. **Execute** via:
   ```bash
   sf apex run --target-org <alias> --file scripts/demo-data/_runs/<file>.apex
   ```

5. **Audit trail**: the executed `.apex` stays on disk under
   `scripts/demo-data/_runs/` (gitignored) so you can replay or inspect later.

## Why no LWC / no Apex service?

This used to live in the package as a Lightning component + Apex service. We
moved it out because:

- It depended on Prompt Builder runtime, which kept breaking on metadata
  redeploys (PR0014 errors) and required manual republishes.
- The customer pool was a hardcoded list of 8 generic names — same boring
  data for every demo.
- It was internal SE tooling polluting a customer-facing package.

By moving it to Claude Code:

- Each run is bespoke: real customers from the seller's market, French names,
  industry-accurate vocabulary.
- No Models API calls during seeding → no Prompt Builder dependency.
- Zero metadata maintenance for this feature.

## Cleanup

There is no automated cleanup script. To wipe a seeded demo:

- Use the data loader on `Demo_Context__c` filtered by `Company__c = '<seller>'`,
  then cascade-delete related Accounts, Contacts, Events, Visit Captures.
- Or ask Claude in a fresh session to write a one-shot cleanup `.apex`.
