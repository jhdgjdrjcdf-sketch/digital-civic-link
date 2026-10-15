Digital Civic Link — Security Remediation

1. Purpose

This document describes the security improvements prepared for the Digital Civic Link application.

These changes require testing in a staging environment before they are applied to production.

2. Security Improvements

The proposed SQL migration addresses the following areas:

- Restrict execution of the "bootstrap_super_admin()" function to prevent unauthorized super-admin initialization.
- Restore the required execution permissions for role-checking functions used by Row Level Security (RLS) policies.
- Restrict public access to options belonging to unpublished polls.
- Prevent authenticated users from directly inserting, updating, or deleting their own lesson progress records.
- Prevent authenticated users from directly inserting or updating course enrollment records.
- Restrict assignment submissions so students cannot assign themselves grades or mark their own submissions as graded.
- Preserve authorized assignment grading for course staff and academy managers.

These changes must be reviewed against the application's existing database policies and RPC functions.

3. Files

The security migration is located at:

"supabase/migrations/20261015090000_security_hardening.sql"

The environment template is located at:

"env.example"

The environment template must contain placeholders only. Never commit production credentials, service-role keys, API secrets, or passwords.

4. Safe Deployment Procedure

1. Create a separate Git branch for security changes.
2. Back up the staging database before applying the migration.
3. Confirm that the migration matches the actual database schema and existing policy names.
4. Apply the migration to staging only.
5. Run the application build and available automated tests.
6. Test the application using an ordinary authenticated account and an authorized staff account.
7. Review database logs for permission errors and unexpected policy behavior.
8. Fix any regressions before considering production deployment.
9. Apply approved changes to production only after a verified backup and rollback plan are available.

5. Required Security Tests

Authentication and roles

- An ordinary authenticated user cannot execute "bootstrap_super_admin()".
- Only the intended authorized administrators have administrative privileges.
- Role-checking functions work correctly when invoked through applicable RLS policies.

Lesson progress

- A user can read their own progress.
- A user cannot directly modify progress records through unauthorized table operations.
- The application's approved lesson-completion flow continues to work.

Course enrollments

- Users cannot directly create or alter enrollment records in unauthorized ways.
- The approved enrollment workflow continues to work.
- Enrollment status and completion information cannot be forged by an ordinary user.

Assignment submissions

- Students can submit assignments only when they satisfy the enrollment requirements.
- Students cannot submit their own grades or mark submissions as graded.
- Students cannot modify a submission after grading unless an explicitly authorized workflow permits it.
- Authorized instructors and academy managers can grade submissions.

Polls

- Public users can read options for published polls.
- Draft or unpublished poll options are not exposed to unauthorized users.

6. Environment and Secret Management

- Keep ".env" and other local environment files out of the public repository.
- Keep ".env.example" as a template containing placeholders.
- Store production secrets in the hosting provider's secret-management settings.
- Never expose a Supabase service-role key in browser-side code or variables prefixed with "VITE_".
- If a real secret has been exposed, rotate or revoke it through the relevant service provider.
- Remember that deleting a file from the latest commit does not remove it from Git history.

7. First Super-Admin Setup

After disabling public execution of "bootstrap_super_admin()", the initial super-admin must be configured through a controlled administrative procedure.

Before inserting a role record:

1. Verify the intended user's UUID in the Supabase Authentication dashboard.
2. Confirm the actual role table schema and uniqueness constraints.
3. Use the Supabase SQL Editor with appropriate administrative privileges.
4. Verify that no unintended account receives elevated privileges.

Do not run an administrative SQL statement with placeholder UUIDs or unverified role values.

8. Verification Status

The presence of a migration file in GitHub does not mean that the migration has been applied successfully.

The following checks must be completed before declaring the remediation successful:

- [ ] Confirm the migration is present in the intended branch.
- [ ] Verify the migration against the actual staging database schema.
- [ ] Apply the migration successfully in staging.
- [ ] Run application lint and build checks.
- [ ] Complete the authentication, RLS, enrollment, progress, assignment, and poll tests.
- [ ] Review application and database logs.
- [ ] Confirm that environment secrets are not exposed in the repository.
- [ ] Review remaining RPC functions, quiz-attempt policies, storage policies, and meeting-related permissions.
- [ ] Obtain approval before production deployment.

9. Limitations

This document describes a targeted security remediation plan. It is not a comprehensive security audit, penetration test, or certification.

Further review is required for database functions, authorization boundaries, storage access, quiz attempts, meeting functionality, and any other write-enabled application workflows.

Production readiness must be determined only after the relevant changes have been applied and verified through testing.