# Upgrade the existing party offices section

## Outcome
Enhance the current `مكاتب التجمع والمرشحين` section in place. The result will keep the existing navy-and-gold identity and all current office records while adding a responsive interactive map, richer office details, candidate profiles, search, filters, nearest-office navigation, and administration tools.

## Data and security
- Keep the existing `offices` table and records unchanged.
- Add structured office contact fields for email and optional secondary contact details without removing current fields.
- Add `office_officials` for each office’s responsible people and roles.
- Add `office_candidates` for candidate profiles, including office/city, portrait, political role, biography, structured CV, education, experience, former roles, achievements, responsibilities, contact links, display order, and visibility.
- Apply least-privilege access: public users can only read visible records; content administrators can create and update them; service access remains available for trusted operations.
- Reuse the existing private office image storage and signed-image links for office and candidate photos.

## Public experience
- Upgrade the existing map to a country-level view with branded navy-and-gold markers, selected-marker state, clustering-safe bounds, keyboard-friendly controls, and reliable marker initialization.
- Selecting a marker or office opens a responsive detail panel showing city, address, contact methods, office officials, and related candidates.
- Add a prominent “Nearest office to me” action that requests permission, calculates distance, focuses the map, opens the matching office, and provides directions.
- Add unified search across city, office, official, and candidate names, plus city and responsibility filters.
- Add candidate profile panels with portrait, full name, political role, city, biography, CV sections, qualifications, experience, previous positions, achievements, responsibilities, and available contact details.
- Preserve clear loading, empty, offline, denied-location, and error states with subtle transitions and full mobile/desktop responsiveness.

## Administration
- Extend the existing administration page rather than creating a separate admin area.
- Keep office editing and add management for office officials and candidates, including office assignment, visibility, ordering, profile details, map coordinates, and photos.
- Validate required fields, coordinates, URLs, image formats, and image sizes before saving.

## Verification
- Confirm existing office rows remain present after the schema update.
- Test map selection, search, filters, nearest-office focus, directions, candidate profile opening, and responsive layouts on mobile and desktop.
- Test administrator create/edit flows and verify public visibility rules.
- Check all affected page metadata, current diagnostics, and the final preview for regressions outside this section.

## Technical details
- Continue using the existing Leaflet map and OpenStreetMap tiles; no new map provider or external credential is needed.
- Use additive database changes only, with indexes on office relationships, city, role, visibility, and display order.
- Keep candidate and official records relational rather than storing profile data inside office rows, so future administration and multiple candidates per office remain maintainable.
