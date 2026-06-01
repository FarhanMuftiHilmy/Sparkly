# Security Specification & Test-Driven Design (TDD) for Radar Meetups

This specification provides the data invariants, payload validation rules, and the test design for verifying the security posture of the Firestore structures.

## 1. Data Invariants

1. **User Invariant**: A user document is owned and editable exclusively by the user themselves matching their `request.auth.uid`. No user can set or alter another user's `trustScore` or status fields.
2. **Meetup Invariant**: A meetup cap is strictly bounded at $\le 5$ participants. Once terminal states (`completed` or `cancelled`) are reached, no further state transition or edit is permitted.
3. **No Overlapping RSVP Invariant**: A user can join/RSVP to at most 1 active meetup in a time slot. This is validated via the client state.
4. **Message Integrity**: A message cannot be spoofed; the `senderId` must match the authenticated `request.auth.uid`, and the message must pertain to a valid meetup where they are a participant.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following malicious writes must be blocked by validation helpers or access control rules:

### Payload 1: Self-Escalating Trust Score (User Update)
An authenticated user attempts to increase their own `trustScore` to 100 artificially.
```json
{
  "id": "attacker_uid",
  "name": "Attacker",
  "trustScore": 100
}
```
*Expected: Rejected (trustScore is immutable for users).*

### Payload 2: Profile Impersonation (User Create)
An attacker attempts to register a profile under an ID other than their authenticated UID.
```json
{
  "id": "victim_uid",
  "name": "Victim",
  "isOnline": true
}
```
*Expected: Rejected (ID must match request.auth.uid).*

### Payload 3: Unbounded Group Capacity (Meetup Create)
An attacker attempts to create a meetup with a capacity limit higher than 5.
```json
{
  "id": "meetup_invalid",
  "title": "Mega Party",
  "creatorId": "attacker_uid",
  "limit": 10,
  "state": "draft"
}
```
*Expected: Rejected (limit must be <= 5).*

### Payload 4: Arbitrary Creator Spoofing (Meetup Create)
An attacker attempts to create a meetup where the `creatorId` is set to another user.
```json
{
  "id": "meetup_spoof",
  "title": "Spoofed Creator Run",
  "creatorId": "victim_uid",
  "limit": 3,
  "state": "draft"
}
```
*Expected: Rejected (creatorId must match request.auth.uid).*

### Payload 5: Lock Bypass for Completed Meetups (Meetup Update)
A malicious user attempts to modify a meetup whose status is already set to `completed`.
```json
{
  "title": "Malicious Modification After End"
}
```
*Expected: Rejected (State terminal locking protects completed/cancelled meetups).*

### Payload 6: Shadow Update Field (Meetup Update)
An attacker attempts to inject a ghost attribute `ghostField: "hacked"` into a meetup.
```json
{
  "title": "Updated Meetup Title",
  "ghostField": "hacked"
}
```
*Expected: Rejected (hasOnly schema constraint blocks unregistered attributes).*

### Payload 7: Unauthorized Chat Injection (Message Create)
A user who is not a participant of a meetup attempts to send a message to its chat log.
```json
{
  "text": "Intruder message",
  "senderId": "unauthorized_uid"
}
```
*Expected: Rejected (User must be a registered participant).*

### Payload 8: Message Sender Impersonation (Message Create)
An attacker sends a message with `senderId` set to a victim's user ID.
```json
{
  "text": "This is Budi speaking...",
  "senderId": "victim_uid"
}
```
*Expected: Rejected (senderId must match request.auth.uid).*

### Payload 9: Denial of Wallet Identifier Flood (Meetup Create)
An attacker attempts to create a meetup with a gigantic title string of 1MB to exhaust retrieval bandwidth.
```json
{
  "title": "<1 Megabyte String...>",
  "creatorId": "attacker_uid",
  "limit": 5,
  "state": "draft"
}
```
*Expected: Rejected (Length limit check of <= 100 character on strings).*

### Payload 10: Client Time Override (Meetup Create)
An attacker tries to manually set the `createdAt` timestamp to years in the future.
```json
{
  "title": "Future Spark",
  "createdAt": "2030-01-01T00:00:00.000Z"
}
```
*Expected: Rejected (createdAt must equal request.time).*

### Payload 11: Invalid ID Format Injection (Meetup Create)
An attacker attempts to inject database commands or paths in the document ID.
```json
{
  "id": "users/attacker_uid/sub_path"
}
```
*Expected: Rejected (isValidId checks format using regex).*

### Payload 12: Direct State Overwrite (Meetup Update - Participant)
A standard participant attempts to directly edit the `state` of a meetup to `active` without forming.
```json
{
  "state": "active"
}
```
*Expected: Rejected (Only the creator can modify the primary state, participants can only join/check-in).*

---

## 3. Test Runner Framework

The validation layer is designed to run locally using the emulator. Let's build a clean, bulletproof ruleset containing helper functions matching this spec.
