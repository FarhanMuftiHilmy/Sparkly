# Changelog

All notable changes to the **Open Meetup Map** project will be documented in this file. This project complies with semantic versioning standards.

---

## [Unreleased] - 2026-06-13

### Added
- **Capacitor Mobile Integration**: Bootstrap of Capacitor framework configuration to target native Android builds:
  - Installed `@capacitor/core`, `@capacitor/android`, and `@capacitor/cli`.
  - Initialized `capacitor.config.ts` under native identifier `com.openmeetupmap.app`.
  - Added Android platforms via `npx cap add android` to prepare for packaging local build assets.
- **Google Maps Navigation Integration**: Embedded a **Directions** panel in the meeting preview sidebar enabling instant navigation:
  - Generates deep-link directions via `https://www.google.com/maps/dir/?api=1&destination=[lat],[lng]`.
  - Replaced coordinate display with styled physical name strings, precise coordinate values, and fallback addresses.
- **Interactive Geofence Visualizations (Map Circles)**: Enhanced Leaflet map tracking by plotting exact radius overlays for meetup zones on selection:
  - **Chat Access Zone**: Light-purple circle with `500m` radius and elegant dashed borders to represent the communication lock.
  - **Check-In Zone**: Amber/gold circle with `200m` radius highlighting the target area to unlock attendance confirmations.

### Fixed
- **Time Representation Overlap Bug**: Resolved a layout overflow error occurring under certain side-by-side scheduled datetimes:
  - Configured word breaks (`break-words`) and flex constraints (`min-w-0`) within meetup cards.
  - Styled `PreviewLayerSidebar` timing component to use full-width row alignments, ensuring absolute readability.
- **Map Control Cleanup**: Filtered out completed or cancelled sparks dynamically to prevent outdated or obsolete meetup pins from appearing on active tracking stages.

---

## [0.1.0] - 2026-06-10

### Added
- **Interactive Map Dashboard**: Implemented Leaflet mapping features supporting center panning, location types (e.g., cafés, parks), and custom marker groupings.
- **Forming & Coordination Chat Engine**: Built micro-coordination tools containing localized chat channels, member limit constraints (max 5), physical check-in states, and real-time distance trackers.
- **Firebase / Firestore backend system**: Integrated cloud-based NoSQL sync strategies via Firestore rules, blueprints, and persistent state adapters.
