import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('reviewed associations preserve source chronology, evidence and event history without backfilled returns', () => {
  const data = JSON.parse(readFileSync(new URL('../../published/data/market_associations.json', import.meta.url), 'utf8'));
  const sources = new Map(data.sources.map(source => [source.id, source]));
  assert.equal(sources.size, data.sources.length);
  assert.equal(data.performance_status, 'not_started');
  assert.equal(data.published_at, null);
  assert.equal(new Set(data.entries.map(entry => entry.id)).size, data.entries.length);
  assert.ok(data.entries.length > 0);
  for (const entry of data.entries) {
    assert.match(entry.ts_code, /^\d{6}\.(SZ|SH|BJ)$/u);
    assert.ok(['animal', 'plant'].includes(entry.theme));
    assert.ok(['homophone', 'character_split', 'zodiac', 'narrative'].includes(entry.relation));
    assert.ok(['pending', 'confirmed', 'expired'].includes(entry.status));
    assert.ok(entry.source_ids.length > 0);
    for (const id of entry.source_ids) {
      const source = sources.get(id);
      assert.ok(source);
      assert.equal(new URL(source.url).protocol, 'https:');
      assert.ok(Date.parse(source.published_at) <= Date.parse(entry.recorded_at));
    }
    assert.equal(entry.source_first_known_at, entry.source_ids.map(id => sources.get(id).published_at).sort()[0]);
    assert.ok(Date.parse(entry.recorded_at) <= Date.parse(entry.reviewed_at));
    assert.ok(Date.parse(entry.reviewed_at) < Date.parse(entry.review_due_at));
    assert.equal(entry.events.at(-1).status, entry.status);
    assert.equal(entry.events.at(-1).at, entry.reviewed_at);
    assert.ok(['media_explicit', 'community_narrative'].includes(entry.evidence));
    if (entry.evidence === 'community_narrative') assert.notEqual(entry.status, 'confirmed');
    assert.ok(entry.catalyst === null || entry.catalyst === 'zodiac_2027');
    let previous = Date.parse(entry.recorded_at);
    for (const event of entry.events) {
      assert.ok(['pending', 'confirmed', 'expired'].includes(event.status));
      assert.ok(Date.parse(event.at) >= previous);
      assert.ok(typeof event.reviewer === 'string' && event.reviewer.length > 0);
      assert.equal(event.reason, 'source_review');
      previous = Date.parse(event.at);
    }
    assert.equal(entry.tracking_start, null);
    assert.deepEqual(Object.keys(entry.summary).sort(), ['en-US', 'zh-CN']);
  }
  assert.equal(data.entries.find(entry => entry.ts_code === '002086.SZ').relation, 'homophone');
  assert.ok(!JSON.stringify(data).match(/"(?:nav|return|price|weight)"/u));
});

test('first-sample receipt binds the exact published sample and a successful deployment record', async () => {
  const { createHash } = await import('node:crypto');
  const sample = readFileSync(new URL('../../published/association-study/cohort-20261104/sample.json', import.meta.url));
  const receipt = JSON.parse(readFileSync(new URL('../../published/data/association_publication.json', import.meta.url), 'utf8'));
  assert.equal(receipt.sample_sha256, createHash('sha256').update(sample).digest('hex'));
  assert.equal(receipt.sample_published_at, '2026-11-04T02:18:40Z');
  assert.match(receipt.evidence_url, /^https:\/\/github.com\/runchengxie\/a-share-zoo-garden\/actions\/runs\/\d+$/u);
  assert.equal(receipt.protocol_registration, null);
});


test('registered cohort hashes bind frozen inputs independently of the editable observation pool', async () => {
  const { createHash } = await import('node:crypto');
  const receipt = JSON.parse(readFileSync(new URL('../../published/data/association_registration.json', import.meta.url), 'utf8'));
  for (const key of ['sample', 'protocol']) {
    const bytes = readFileSync(new URL(`../../published/association-study/cohort-20261104/${key}.json`, import.meta.url));
    assert.equal(receipt[`${key}_sha256`], createHash('sha256').update(bytes).digest('hex'));
  }
  assert.equal(receipt.protocol_published_at, '2026-11-04T02:48:15Z');
});
