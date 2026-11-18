import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  isSafeHttpsUrl,
  isValidUsername,
  normalizeUsername,
  deterministicDmId,
  isImageExpired,
  isRingCallStale,
  isFileSizeAllowed,
  parseBuildChatsTxt,
  TEN_DAYS_MS,
  CALL_RING_MAX_AGE_MS,
  MAX_UPLOAD_BYTES,
} from './gekkoCore';

test('escapeHtml neutralizes XSS vectors', () => {
  assert.equal(
    escapeHtml('<script>alert("xss")</script> & \'quote\''),
    '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;quote&#39;'
  );
});

test('isSafeHttpsUrl accepts https only and rejects javascript/http/data', () => {
  assert.equal(isSafeHttpsUrl('https://firebasestorage.googleapis.com/v0/b/x/o/y'), true);
  assert.equal(isSafeHttpsUrl('http://example.com/img.png'), false);
  assert.equal(isSafeHttpsUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpsUrl('data:image/svg+xml,<svg/>'), false);
});

test('username validation and normalization are case-insensitive', () => {
  assert.equal(isValidUsername('ab'), false);
  assert.equal(isValidUsername('Gekko_User-1'), true);
  assert.equal(isValidUsername('user with spaces'), false);
  assert.equal(normalizeUsername('  Alice_99 '), 'alice_99');
});

test('deterministicDmId is symmetric regardless of argument order', () => {
  assert.equal(deterministicDmId('uidB', 'uidA'), 'dm_uidA_uidB');
  assert.equal(deterministicDmId('uidA', 'uidB'), 'dm_uidA_uidB');
});

test('image expiry and call staleness thresholds work accurately', () => {
  const now = 1_700_000_000_000;
  assert.equal(isImageExpired(now - TEN_DAYS_MS + 1000, now), false);
  assert.equal(isImageExpired(now - TEN_DAYS_MS - 1000, now), true);
  assert.equal(isRingCallStale(now - CALL_RING_MAX_AGE_MS + 1000, now), false);
  assert.equal(isRingCallStale(now - CALL_RING_MAX_AGE_MS - 1000, now), true);
});

test('isFileSizeAllowed enforces 10 MB ceiling', () => {
  assert.equal(isFileSizeAllowed(0), false);
  assert.equal(isFileSizeAllowed(1024), true);
  assert.equal(isFileSizeAllowed(MAX_UPLOAD_BYTES), true);
  assert.equal(isFileSizeAllowed(MAX_UPLOAD_BYTES + 1), false);
});

test('parseBuildChatsTxt handles JSON arrays and pipe-delimited lines filtered by username', () => {
  const jsonRaw = JSON.stringify([
    { username: 'Alice', question: 'Build CRM', response: 'Done' },
    { username: 'Bob', question: 'Build Blog', response: 'Tomorrow' },
  ]);
  assert.deepEqual(parseBuildChatsTxt(jsonRaw, 'alice'), [
    { username: 'Alice', question: 'Build CRM', response: 'Done' },
  ]);

  const linesRaw = [
    '# comment',
    'Alice | Add dark mode | Shipped in v2',
    'Bob | Fix bug | In review',
  ].join('\n');
  assert.deepEqual(parseBuildChatsTxt(linesRaw, 'ALICE'), [
    { username: 'Alice', question: 'Add dark mode', response: 'Shipped in v2' },
  ]);
});
