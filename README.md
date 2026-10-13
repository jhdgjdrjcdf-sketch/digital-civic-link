# Connect & Engage

Build a modern, professional, secure, and high-quality mobile application for a political party. The application should serve as an official digital platform that connects the party with citizens, supporters, members, young people, and the wider community.



The design must be modern, clean, elegant, trustworthy, easy to navigate, responsive, and suitable for both Android and iOS. The application must feel like a professionally developed real-world political organization platform, not a simple prototype.



IMPORTANT LANGUAGE REQUIREMENT:

All interface text, system messages, buttons, descriptions, error messages, and administrative tools must be in English, except for the names of the main sections, which must remain in Arabic exactly as specified.



==================================================

MAIN APPLICATION SECTIONS

==================================================



1. الرئيسية



This is the main home page of the application.



It should include:



- A modern and professional welcome area.

- The latest important announcements.

- Featured news.

- Important upcoming events.

- Quick access to the main sections.

- Highlighted initiatives and activities.

- Important messages from the party.

- A clean and dynamic layout.



The home page must automatically prioritize important content while avoiding information overload.



==================================================



2. صوت التجمع



This section represents the official news platform of the party.



It should include:



- Latest official news.

- Political announcements.

- Statements.

- Party activities.

- Reports.

- Articles.

- Media content.

- Important updates.



Each news article should have:



- Title.

- Cover image.

- Publication date.

- Category.

- Author or official source.

- Full article content.

- Related articles.



News must be displayed in a professional, readable format.



Administrators must be able to:



- Create news.

- Edit news.

- Publish news.

- Schedule publication.

- Archive news.

- Remove or unpublish content.



Only authorized administrators should be able to manage official content.



==================================================



3. Events



Create a professional events section.



Users should be able to see:



- Upcoming events.

- Event title.

- Date.

- Time.

- Location.

- Description.

- Event image.

- Important event information.



Events can include:



- Political meetings.

- Public events.

- Conferences.

- Community activities.

- Educational activities.

- Youth activities.



Administrators must be able to:



- Create events.

- Edit events.

- Cancel events.

- Update event information.

- Archive completed events.



The application must correctly handle:



- Time zones.

- Past events.

- Cancelled events.

- Duplicate events.

- Invalid dates.

- Missing event information.



==================================================



4. مجلس اعضاء الحزب



Create a dedicated section for young people to participate in discussions, ideas, research, and innovation.



This section should encourage constructive participation.



Users should be able to interact with discussions using the following options:



- مؤيد

- رافض

- مداخلة



Users should also be able to participate in:



- Discussions.

- Research.

- Political and social ideas.

- Innovation.

- Youth initiatives.

- Constructive proposals.



The system must prevent:



- Duplicate reactions.

- Multiple conflicting reactions from the same user.

- Spam.

- Automated abuse.

- Repeated submissions caused by network retries.



A user should not be able to manipulate voting or reaction counts.



Discussion content must be moderated.



Administrators or authorized moderators should be able to:



- Review reports.

- Remove inappropriate content.

- Lock discussions.

- Archive discussions.

- Manage abusive users according to defined permissions.



The system should preserve freedom of constructive discussion while protecting the platform from abuse, harassment, spam, and manipulation.



==================================================



5. Polls



Create a secure polling section.



Polls can be used to collect opinions from users regarding:



- Public issues.

- Party initiatives.

- Community topics.

- Youth issues.

- Internal public consultations where appropriate.



Each poll should include:



- Question.

- Available options.

- Start date.

- End date.

- Status.

- Results when permitted.



The system must guarantee:



- One vote per eligible user per poll.

- Protection against duplicate submissions.

- Protection against repeated network requests.

- Accurate vote counting.

- Atomic vote processing.

- Protection against race conditions.

- Protection against manipulation.



Votes must never be counted twice.



The system must handle situations where:



- The user loses internet connection.

- The application is closed during submission.

- The same request is sent multiple times.

- The user refreshes the application.

- Multiple devices attempt to submit requests simultaneously.



Sensitive voting data must not be exposed unnecessarily.



==================================================



6. النزاهة والشفافية



Create a comprehensive transparency and integrity section.



This section should provide clear and organized public information about:



- Funding information where appropriate.

- Financial transparency.

- Important decisions.

- Official disclosures.

- Performance indicators.

- Party commitments.

- Progress toward commitments.

- Public reports.



Information should be presented clearly and professionally.



The system should allow authorized administrators to publish:



- Documents.

- Reports.

- Indicators.

- Updates.

- Official statements.



Published information must have:



- Publication date.

- Source.

- Version where applicable.



The system must prevent unauthorized modification of published records.



Important changes should be traceable through secure audit records.



==================================================



7. أكاديمية القيادة



Create a learning and development section for leadership education.



This section should include:



- Courses.

- Educational materials.

- Training programs.

- Leadership development.

- Political education.

- Research materials.



Each course can include:



- Title.

- Description.

- Cover image.

- Lessons.

- Educational materials.

- Progress tracking where appropriate.



Administrators must be able to manage:



- Courses.

- Lessons.

- Educational content.

- Publication status.



The application must correctly handle:



- Interrupted progress.

- Network failures.

- Duplicate progress updates.

- Invalid or deleted content.

- Content that becomes unavailable.



==================================================

SECURITY ARCHITECTURE

==================================================



Security must be designed into the application from the beginning and must not be added as a superficial feature.



Use a security-by-design and privacy-by-design approach.



Apply the principle of:



DEFAULT DENY



Every action, resource, administrative function, and sensitive operation must be denied by default unless explicitly authorized.



Never trust the client application.



All important security decisions must be validated on the server side.



Do not rely only on:



- Hidden buttons.

- Client-side validation.

- User interface restrictions.

- Front-end permissions.



==================================================

AUTHENTICATION AND ADMINISTRATIVE SECURITY

==================================================



Administrative accounts must have strong protection.



Implement:



- Secure authentication.

- Strong password requirements.

- Secure password storage using modern password hashing.

- Multi-factor authentication for administrative accounts where supported.

- Session expiration.

- Secure session management.

- Protection against session fixation.

- Protection against unauthorized session reuse.

- Secure logout.



Administrative accounts must never have unrestricted access by default.



Use:



ROLE-BASED ACCESS CONTROL



Create a clear permission matrix.



Example roles may include:



- Super Administrator.

- Content Administrator.

- News Editor.

- Event Manager.

- Moderator.

- Transparency Manager.

- Academy Manager.



Each role must only have the minimum permissions necessary.



Apply:



LEAST PRIVILEGE



No administrator should automatically receive unnecessary permissions.



==================================================

PRIVILEGED ACCESS PROTECTION

==================================================



Highly sensitive actions must receive additional protection.



Examples include:



- Creating or deleting administrators.

- Changing permissions.

- Publishing sensitive information.

- Deleting important public records.

- Exporting sensitive data.

- Changing security settings.



Require appropriate additional verification for highly privileged actions.



Important administrative actions must be recorded in secure audit logs.



Audit logs should record:



- What action occurred.

- When it occurred.

- Which authorized account performed it.



Audit records must not expose unnecessary sensitive information.



Audit logs should be protected from unauthorized modification.



==================================================

INSIDER THREAT PROTECTION

==================================================



The system must consider risks from authorized users and administrators.



Do not assume that every authenticated administrator is automatically trustworthy for every action.



Protect against:



- Excessive permissions.

- Accidental deletion.

- Unauthorized exports.

- Abuse of administrative privileges.

- Unauthorized modification of important records.



Use permission separation where appropriate.



Sensitive actions should be clearly separated from ordinary content management actions.



==================================================

DATA PROTECTION AND PRIVACY

==================================================



Collect the minimum amount of personal data necessary.



Do not collect unnecessary information.



Apply:



DATA MINIMIZATION



Avoid storing:



- Unnecessary personal information.

- Sensitive information that is not required for the application's function.



Protect data both:



- In transit.

- At rest where supported.



Use secure connections for all communication.



Sensitive information must never be exposed in:



- Error messages.

- Logs.

- Client-side code.

- URLs.

- Public API responses.



Do not expose:



- Internal database identifiers unnecessarily.

- Administrative information.

- Security configuration.

- Internal system architecture.

- Sensitive metadata.



==================================================

API SECURITY

==================================================



All APIs must be protected.



Implement:



- Authentication where required.

- Server-side authorization.

- Input validation.

- Output validation.

- Rate limiting.

- Request size limits.

- Protection against malformed requests.

- Protection against unauthorized access.



Every API request involving protected resources must verify:



1. Who is making the request.

2. Whether the user is authenticated when authentication is required.

3. Whether the user is authorized to perform that exact action.



Never assume that a user is authorized simply because the user interface allowed access.



Protect against:



- Unauthorized object access.

- Resource enumeration.

- Parameter manipulation.

- Excessive API requests.

- Malformed input.

- Duplicate requests.



==================================================

RESOURCE ENUMERATION PROTECTION

==================================================



The application must not allow users to discover protected resources simply by changing IDs or parameters.



Always verify authorization before returning protected information.



Do not expose predictable identifiers when this creates unnecessary security risks.



Protected resources must not reveal whether they exist to unauthorized users.



==================================================

INPUT VALIDATION

==================================================



Validate all user input.



Validation must occur on the server side.



The client may provide user-friendly validation, but server-side validation is mandatory.



Protect against:



- Invalid input.

- Unexpected data types.

- Excessively large input.

- Malformed requests.

- Duplicate submissions.

- Unexpected characters where relevant.



Never directly trust user-generated content.



==================================================

CONTENT SECURITY

==================================================



User-generated content must be handled safely.



Prevent content from:



- Executing code.

- Breaking the application interface.

- Affecting other users.

- Injecting malicious content.



Sanitize and validate content before displaying it.



==================================================

FILE AND MEDIA SECURITY

==================================================



If administrators can upload images or documents:



- Validate file types.

- Validate file sizes.

- Reject unsupported files.

- Do not trust file extensions alone.

- Prevent executable content from being treated as safe media.

- Store uploaded files securely.



The system must handle:



- Interrupted uploads.

- Duplicate uploads.

- Corrupted files.

- Deleted files.

- Missing files.



==================================================

EXPORT AND IMPORT SECURITY

==================================================



Data export and import features must be considered sensitive.



Do not allow unrestricted data exports.



Exports must:



- Require appropriate permissions.

- Contain only necessary information.

- Avoid exposing sensitive data.



Import operations must:



- Validate all imported data.

- Reject malformed files.

- Prevent duplicate or corrupted records.

- Avoid partial database corruption.



Failed imports must not leave the system in an inconsistent state.



==================================================

CACHING AND DATA PRIVACY

==================================================



Do not cache sensitive information unnecessarily.



The application must correctly handle:



- Expired cached data.

- Deleted content.

- Changed permissions.

- Logged-out users.

- Switched accounts.



A user must not see sensitive cached information belonging to a previous account.



When permissions change, the system must not continue granting access based on outdated cached permissions.



==================================================

BACKGROUND JOBS, QUEUES, AND RETRIES

==================================================



Any background process must be designed safely.



The system must correctly handle:



- Duplicate jobs.

- Failed jobs.

- Repeated retries.

- Interrupted processes.

- Network failures.

- Dependency failures.



Operations that may be retried must be designed to avoid duplicate effects.



Use idempotent operations where appropriate.



For example:



A request that is accidentally sent multiple times must not create multiple votes, multiple comments, multiple events, or duplicate records.



==================================================

AI FEATURES

==================================================



Do not automatically give AI systems access to:



- Administrative permissions.

- Sensitive databases.

- Private user information.

- Security settings.

- Administrative actions.



Any future AI feature must operate with restricted permissions.



AI-generated content must not automatically be treated as official party content without appropriate human authorization.



Never allow an AI feature to bypass the permission system.



==================================================

FEATURE SECURITY GATES

==================================================



Every new feature added to the application must pass security and reliability checks before being enabled.



A feature must not be considered complete simply because it works under normal conditions.



Before enabling a feature, verify:



- Authentication.

- Authorization.

- Input validation.

- Error handling.

- Privacy impact.

- Duplicate request behavior.

- Network failure behavior.

- Permission boundaries.



==================================================

BUG PREVENTION AND RELIABILITY

==================================================



The application must be highly resistant to bugs, crashes, unexpected user behavior, and unusual edge cases.



Do not design only for the ideal user flow.



Assume that users may:



- Tap buttons repeatedly.

- Tap multiple buttons quickly.

- Refresh pages.

- Close the application unexpectedly.

- Reopen the application.

- Lose internet access.

- Switch networks.

- Receive delayed responses.

- Submit the same request multiple times.

- Use multiple devices.

- Navigate backward during an operation.

- Leave a page while data is loading.

- Return to a page with outdated data.



The application must handle these situations safely.



==================================================

DOUBLE-SUBMISSION PROTECTION

==================================================



Prevent duplicate operations.



Examples include:



- Duplicate comments.

- Duplicate votes.

- Duplicate reactions.

- Duplicate events.

- Duplicate news submissions.

- Duplicate administrative actions.



Do not rely only on disabling a button.



The server must also protect against duplicate requests.



==================================================

RACE CONDITION PROTECTION

==================================================



Protect shared operations from race conditions.



Examples include:



- Multiple users voting simultaneously.

- Multiple administrators editing the same content.

- Simultaneous reactions.

- Multiple requests modifying the same record.



The system must preserve data consistency.



Counts must remain accurate.



Records must not become corrupted.



==================================================

STATE MANAGEMENT

==================================================



Application state must remain consistent.



Prevent:



- Stale data.

- Invalid states.

- Partially completed operations.

- Conflicting states.

- Incorrect loading states.



The user interface must correctly distinguish between:



- Loading.

- Success.

- Failure.

- Empty results.

- Offline mode.



Never leave the application permanently stuck in a loading state.



==================================================

NETWORK FAILURE HANDLING

==================================================



The application must handle:



- Slow internet.

- Lost internet connection.

- Server timeouts.

- Interrupted requests.

- Delayed responses.

- Temporary service failures.



Show clear and user-friendly messages.



Do not expose internal technical information to users.



The application must not crash because a network request fails.



Users must be able to safely retry operations when appropriate.



==================================================

DEPENDENCY FAILURE HANDLING

==================================================



Assume that external services may temporarily fail.



The application must handle failures without:



- Crashing.

- Corrupting data.

- Repeating destructive operations.



Gracefully degrade non-essential functionality when possible.



==================================================

DATABASE INTEGRITY

==================================================



Database operations must preserve consistency.



Avoid partial updates.



If a multi-step operation fails, the system should not leave data in an inconsistent state.



Critical operations should be handled atomically where appropriate.



Prevent:



- Orphaned records.

- Duplicate records.

- Broken relationships.

- Invalid references.

- Partial data corruption.



==================================================

CONCURRENT EDITING

==================================================



Handle situations where multiple administrators edit the same content.



The system must prevent silent overwriting of important changes.



Use an appropriate strategy to detect or manage conflicting updates.



==================================================

ERROR HANDLING

==================================================



All errors must be handled gracefully.



The application must never:



- Crash unnecessarily.

- Freeze permanently.

- Show raw internal errors.

- Expose stack traces.

- Expose database details.

- Expose secrets.



Use safe error messages.



Detailed technical errors may be recorded securely for authorized developers or administrators, but sensitive information must not be exposed.



==================================================

RECOVERY AND DATA CONSISTENCY

==================================================



The system must recover safely from interrupted operations.



Examples include:



- Application closes during a request.

- Device loses power.

- Internet disconnects.

- Server temporarily fails.



The system must determine whether an operation:



- Succeeded.

- Failed.

- Is still processing.



Never blindly repeat an operation when this could create duplicate data.



==================================================

EMPTY AND UNEXPECTED STATES

==================================================



Every screen must handle:



- No data.

- Deleted data.

- Missing images.

- Missing users.

- Unavailable content.

- Expired events.

- Failed requests.

- Unauthorized access.



Do not leave blank broken screens.



Provide meaningful empty states and safe fallback behavior.



==================================================

PERFORMANCE

==================================================



The application must remain responsive.



Avoid:



- Unnecessary requests.

- Infinite loading.

- Repeated requests.

- Memory leaks.

- Excessive data loading.



Use efficient loading and pagination where appropriate.



Large lists of:



- News.

- Events.

- Discussions.

- Courses.



must remain performant.



==================================================

OFFLINE AND RECONNECTION BEHAVIOR

==================================================



The application must correctly detect network availability.



When the connection is lost:



- Do not falsely report successful operations.

- Do not create uncontrolled retries.

- Do not lose application stability.



When the connection returns:



- Refresh data safely.

- Avoid duplicate operations.

- Resolve pending states carefully.



==================================================

LOGGING

==================================================



Use secure logging for debugging and reliability monitoring.



Never log:



- Passwords.

- Authentication secrets.

- Access tokens.

- Sensitive personal information.

- Other confidential data.



Logs must be protected.



==================================================

NO SECURITY THEATER

==================================================



Do not implement fake security measures that only create the appearance of security.



Every security control must have a real purpose.



Do not rely on:



- Hidden interface elements.

- Obscurity.

- Client-side-only restrictions.

- Fake permission checks.



Security must be enforced by the actual backend and authorization system.



==================================================

FINAL QUALITY REQUIREMENTS

==================================================



Build the application as a production-quality platform.



The application must be:



- Professional.

- Modern.

- Secure.

- Reliable.

- Responsive.

- Scalable.

- Easy to maintain.

- Resistant to common bugs.

- Resistant to unexpected user behavior.

- Designed for future expansion.



Do not build a simple static demonstration.



Build a complete and realistic application structure with:



- A professional user interface.

- Clear navigation.

- Proper data models.

- Secure authentication where required.

- Strict authorization.

- Administrative controls.

- Content management.

- Error handling.

- Loading states.

- Empty states.

- Network failure handling.

- Retry safety.

- Duplicate request protection.

- Race condition protection.

- Data consistency protection.

- Secure audit logging.



Before considering the application complete, test every major feature against:



- Normal usage.

- Invalid input.

- Missing data.

- Repeated clicks.

- Duplicate requests.

- Slow internet.

- No internet.

- Interrupted requests.

- Simultaneous actions.

- Multiple devices.

- Unauthorized access.

- Permission changes.

- Deleted content.

- Server failures.

- Unexpected navigation.



The final application should provide a trustworthy, secure, stable, and professional digital platform for the political party and its community.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7a77f3ef-a652-4c80-a028-fc642e1575e6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
