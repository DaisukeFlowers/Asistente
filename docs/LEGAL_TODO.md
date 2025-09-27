# Legal Content TODO (Schedulink)

This document enumerates required sections for production-ready legal pages. Replace placeholders in the app once final counsel-approved text is ready.

## Privacy Policy Required Sections
1. Introduction & Scope
2. Data Controller Identification (company name, contact)
3. Categories of Data Collected
   - Account identity data (name, email, Google profile ID)
   - Calendar event metadata (only fields required for automation)
   - System logs (IP (if stored), timestamps, action types)
4. Lawful Basis / Purpose of Processing (if applicable by jurisdiction)
5. Data Usage (automation, reminders, scheduling synchronization)
6. Data Retention & Deletion Policy
7. Data Sharing / Subprocessors (e.g., Google APIs, infrastructure providers)
8. International Transfers (if any)
9. Security Measures (encryption at rest for refresh tokens, session controls)
10. User Rights & Exercise Mechanisms (access, deletion, revocation)
11. Revoking Google Access (link + steps to Google security settings)
12. Changes to Policy & Versioning
13. Contact Information (support email)

## Terms of Service Required Sections
1. Service Description (automation assistant for scheduling)
2. Account Eligibility & Registration
3. Acceptable Use (prohibited behaviors, abuse)
4. User Responsibilities (accuracy of scheduling info)
5. Service Availability / Beta Disclaimer
6. Integrations & Third-Party Services (Google)
7. Intellectual Property / License
8. Payment & Plan (if/when introduced) – placeholder
9. Termination / Suspension Conditions
10. Disclaimer of Warranties
11. Limitation of Liability
12. Indemnification
13. Governing Law / Jurisdiction
14. Modifications to Terms
15. Contact Information

## Implementation Notes
- Do NOT ship placeholders to production.
- Each page should display last updated date.
- Provide explicit link to revoke Google permissions.
- Provide separate contact for data protection concerns (if required).

## Follow-Up Actions
- [ ] Collect counsel-approved drafts.
- [ ] Add version tagging (e.g., PP v1.0, TOS v1.0) in footer or page header.
- [ ] Add user notification mechanism for changes (email / in-app banner).
