# Security Specification - Uganda Votes

## 1. Data Invariants
- A User profile exists for every authenticated voter.
- Users can ONLY modify their own profile (except admins).
- Users can ONLY read their own profile (PII protection) unless they are admins.
- Polls are publicly readable but only admin-writable.
- Candidates belong to Polls.
- Votes are immutable once cast and linked to a User via UID and a Poll.
- Daily Votes prevent double voting within 24h.
- Special Polls require an Eligible ID.
- Comments are authenticated and linked to a User.

## 2. The "Dirty Dozen" Payloads

1. **Self-Promotion**: User attempts to update their own `isAdmin` field to `true`.
2. **Identity Spoofing**: User A attempts to create a vote document with User B's UID.
3. **Poll Hijacking**: Non-admin attempts to change a Poll's `endDate` or `status`.
4. **Vote Padding**: User A attempts to vote multiple times in the same poll bypassing `dailyVotes` (captured by rules requiring both `votes/{uid}` and `dailyVotes/{date_uid}`).
5. **Ghost Candidate**: Non-admin attempts to add a new candidate to a poll.
6. **PII Leak**: Authenticated User A attempts to `get` User B's profile to see their email.
7. **Bypass Eligibility**: Non-eligible user attempts to vote in a `isSpecial` poll.
8. **Comment Impersonation**: User A attempts to post a comment with User B's `displayName`.
9. **Settings Manipulation**: Non-admin attempts to update global sponsors.
10. **Timestamp Fraud**: User attempts to set `createdAt` to a past date instead of `request.time`.
11. **Negative Votes**: User attempts to "update" a candidate's `voteCount` by a negative number (though rules generally only allow incrementing by 1 or via admin).
12. **Orphaned Vote**: Creating a vote for a poll ID that does not exist.

## 3. Test Runner Strategy
- Verify that `users/{uid}` read is restricted to owner/admin.
- Verify that `users/{uid}` update of `isAdmin` is restricted to admin.
- Verify that `polls` write is restricted to admin.
- Verify that `votes` creation requires matching `voterId`.
- Verify that special polls check `eligibleIds`.
