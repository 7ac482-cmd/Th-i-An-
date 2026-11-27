# Security Specification — Cá Ngộ Độc

## Data Invariants
1. **PII Isolation**: `/users/{userId}` contains `email` and `photoURL`. Only the owner (`request.auth.uid == userId`) or a verified admin may read or write their profile. No `role` or `isAdmin` field is permitted in `/users/{userId}`.
2. **Admin-Only Catalog Mutations**: Only a verified admin (`7ac482@gmail.com` with `email_verified == true` or UID present in `/admins/{uid}`) can create, update, or delete `/characters/{characterId}` and `/tracks/{trackId}`.
3. **Referential Integrity (Master Gate)**: Likes (`/characters/{characterId}/likes/{userId}`) and comments (`/characters/{characterId}/comments/{commentId}`) cannot be created unless the parent `/characters/{characterId}` document exists.
4. **Identity & Immutability**: Comment `userId`, `characterId`, and `createdAt` are immutable after creation; users can only edit `content` or delete their own comments (or admin can delete). Like document ID must match `request.auth.uid`.
5. **Temporal & Volumetric Bounds**: All `createdAt` and `updatedAt` timestamps must equal `request.time`. Every string and array is strictly bounded.

## Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated write to `/characters/evil` -> DENIED (not admin).
2. Verified non-admin user creating `/characters/evil` -> DENIED (not admin).
3. Unverified email spoofing `7ac482@gmail.com` (`email_verified: false`) writing `/characters/evil` -> DENIED.
4. User writing `/users/uid-A` with extra shadow field `{ isAdmin: true }` -> DENIED (`hasOnly` rejects).
5. User A reading `/users/uid-B` -> DENIED (PII isolation).
6. User A creating `/characters/c1/likes/uid-B` -> DENIED (`userId != request.auth.uid`).
7. User A creating `/characters/non-existent/likes/uid-A` -> DENIED (Master Gate `exists()` fails).
8. User A creating `/characters/c1/comments/m1` with `userId: 'uid-B'` -> DENIED (identity integrity).
9. User A creating `/characters/c1/comments/m1` with client-forged `createdAt` (`!= request.time`) -> DENIED.
10. User A updating `/characters/c1/comments/m1` to change `userId` or `createdAt` -> DENIED (`affectedKeys().hasOnly(['content'])`).
11. User A deleting User B's comment -> DENIED.
12. Attacker injecting a >128 char document ID `/characters/aaa...` -> DENIED (`isValidId()`).
