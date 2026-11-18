# Gekko Security Specification

## Data Invariants
1. `/users/{uid}`: Read requires authentication; create/update/delete strictly require `request.auth.uid == uid` and `incoming().uid == uid`.
2. `/usernames/{usernameLower}`: Public `get` only (`list` denied to prevent scraping); create-only by owner (`incoming().uid == request.auth.uid`) when doc does not yet exist (`!exists(...)`), ensuring unique case-insensitive usernames.
3. `/domains/{domainId}`: Public `read` so the sign-up wizard can load domains and verify SHA-256 `passHash`; all client writes denied.
4. `/build_prompts/{promptId}`: Author-only `create` (`incoming().uid == request.auth.uid`, initial `response == ""`) and author-only `read` (`existing().uid == request.auth.uid`); client `update`/`delete` denied (responses written via Firebase console).
5. `/files/{fileId}`: Owner-only `create` and `delete` (`ownerUid == request.auth.uid`); `read` allowed for owner OR members of the same domain when `scope == 'domain'`.
6. `/chats/{chatId}`: `get` allowed for members (or `resource == null` check guarded); `list` strictly requires `request.auth.uid in resource.data.members`; `create` requires creator in `members` and `admin == request.auth.uid`; `update`/`delete` restricted to `existing().admin == request.auth.uid`.
7. `/chats/{chatId}/messages/{messageId}`: Requires membership in parent `/chats/{chatId}` via `get()`. Updates only permitted to expire images older than 10 days (`imageUrl: null, imagePath: null, imageExpired: true`).
8. `/active_calls/{callId}`: Strictly restricted to `callerUid` and `receiverUid`.

## Dirty Dozen Adversarial Payloads
1. Unauthenticated `list` on `/usernames` -> DENIED (`allow list: if false`).
2. User B claiming already-taken `/usernames/alice` -> DENIED (`create` only, `!exists`).
3. User A writing `/users/userB` -> DENIED (`uid != request.auth.uid`).
4. User A writing `/domains/evil` -> DENIED (all writes denied).
5. User A creating `/build_prompts/p1` with `uid: 'userB'` -> DENIED (identity spoofing).
6. User A creating `/build_prompts/p1` with pre-populated `response: 'hacked'` -> DENIED (`response == ''`).
7. User B reading User A's `/build_prompts/p1` -> DENIED (`uid != request.auth.uid`).
8. Non-member reading `/chats/c1/messages/m1` -> DENIED (parent `get()` membership gate).
9. Non-admin member updating `/chats/c1` name or members -> DENIED (`admin == request.auth.uid`).
10. Third-party User C reading `/active_calls/call1` -> DENIED (`callerUid` / `receiverUid` gate).
11. User B reading User A's personal `/files/f1` -> DENIED (`scope == 'personal'`, `ownerUid != request.auth.uid`).
12. Shadow update adding `isAdmin: true` to `/users/userA` -> DENIED (`keys().hasOnly(...)`).
