const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const database = require('../app/database');

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'amlak-salam-smoke-'));
  try {
    const info = await database.initialize(directory);
    assert.strictEqual(info.schemaVersion, '1');

    const draft = database.saveDraft({
      type: 'property',
      step: 2,
      payload: { transactionType: 'sale', property: { propertyType: 'apartment' } }
    });
    assert.ok(draft.id);
    assert.strictEqual(database.getDraft(draft.id).step, 2);
    assert.strictEqual(database.listDrafts().length, 1);

    const property = database.submitRecord({
      type: 'property',
      draftId: draft.id,
      payload: {
        transactionType: 'sale',
        property: { propertyType: 'apartment', usageType: 'residential' },
        location: { province: 'سمنان', county: 'گرمسار', city: 'گرمسار', neighborhood: 'آزمایشی' },
        details: { area: 92, constructionYear: 1400, elevator: true, parkingType: 'exclusive', storage: true, directLight: true, facilities: ['تلفن ثابت'] },
        pricing: { publicPrice: 8500000000, redlinePrice: 8100000000 },
        contact: { fullName: 'آزمون داخلی', mobile: '09000000000' },
        notes: { public: 'یادداشت آزمایشی عمومی', confidential: 'یادداشت آزمایشی محرمانه' }
      }
    });
    assert.ok(property.code.startsWith('AS-P-'));
    assert.strictEqual(database.listRecords('property').length, 1);
    assert.strictEqual(database.listDrafts().length, 0);
    const propertySummary = database.listRecords('property')[0];
    assert.ok(!Object.prototype.hasOwnProperty.call(propertySummary, 'redline_price'));
    assert.ok(!Object.prototype.hasOwnProperty.call(propertySummary, 'confidential_notes'));

    const demand = database.submitRecord({
      type: 'demand',
      payload: {
        transactionType: 'purchase',
        property: { propertyType: 'apartment', usageType: 'residential' },
        location: { city: 'گرمسار' },
        details: { areaMin: 70, areaMax: 110, bedroomsMin: 2, facilities: ['پارکینگ'] },
        pricing: { budgetMin: 5000000000, budgetMax: 9000000000 },
        conditions: { depositMin: 0, depositMax: 0, rentMin: 0, rentMax: 0 },
        contact: { fullName: 'متقاضی آزمایشی', mobile: '09120000000' },
        notes: { public: 'تقاضای آزمایشی', confidential: '' }
      }
    });
    assert.ok(demand.code.startsWith('AS-D-'));
    assert.strictEqual(database.listRecords('demand').length, 1);

    const stats = database.dashboardStats();
    assert.strictEqual(stats.properties, 1);
    assert.strictEqual(stats.demands, 1);
    assert.strictEqual(stats.drafts, 0);
    console.log('Stage 07 database smoke test: PASS');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
