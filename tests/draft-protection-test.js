const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const database = require('../app/database');

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'amlak-salam-drafts-'));
  try {
    await database.initialize(directory);
    const first = database.saveDraft({
      type: 'property',
      step: 1,
      payload: { transactionType: 'sale', contact: { fullName: 'نسخه نخست' } }
    });
    const second = database.saveDraft({
      id: first.id,
      type: 'property',
      step: 4,
      payload: { transactionType: 'sale', contact: { fullName: 'آخرین تغییر' }, details: { area: 125 } }
    });
    assert.strictEqual(second.id, first.id, 'autosave must update the same draft');
    assert.strictEqual(database.listDrafts().length, 1, 'repeated autosaves must not create duplicate drafts');
    const latest = database.getDraft(first.id);
    assert.strictEqual(latest.step, 4);
    assert.strictEqual(latest.payload.contact.fullName, 'آخرین تغییر');
    assert.strictEqual(latest.payload.details.area, 125);

    await database.initialize(directory);
    const afterReload = database.getDraft(first.id);
    assert.strictEqual(afterReload.step, 4, 'latest saved step must survive database reload');
    assert.strictEqual(afterReload.payload.contact.fullName, 'آخرین تغییر', 'latest saved values must survive database reload');
    assert.strictEqual(afterReload.payload.details.area, 125);
    console.log('Stage 13 draft protection test: PASS');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
