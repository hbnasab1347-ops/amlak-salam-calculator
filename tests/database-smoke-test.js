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

    const province = database.saveLocation({ level:'province', officialName:'سمنان', commonName:'', sortOrder:1 });
    const county = database.saveLocation({ level:'county', parentId:province.id, officialName:'گرمسار', commonName:'', sortOrder:1 });
    const city = database.saveLocation({ level:'city', parentId:county.id, officialName:'گرمسار', commonName:'', sortOrder:1 });
    const district = database.saveLocation({ level:'district', parentId:city.id, officialName:'منطقه آزمایشی', commonName:'', sortOrder:1 });
    const neighborhood = database.saveLocation({ level:'neighborhood', parentId:district.id, officialName:'محله آزمایشی', commonName:'', sortOrder:1 });
    const street = database.saveLocation({ level:'street', parentId:neighborhood.id, officialName:'خیابان آزمایشی', commonName:'نام رایج', sortOrder:1 });
    assert.strictEqual(database.listLocationCatalog(false).length, 6);
    assert.strictEqual(database.listLocations(null,false)[0].officialName, 'سمنان');
    assert.strictEqual(database.listLocationChildren(neighborhood.id,false)[0].id, street.id);
    assert.throws(() => database.saveLocation({ level:'county', parentId:city.id, officialName:'والد نامعتبر' }), /بالادستی/);
    assert.throws(() => database.setLocationActive(province.id,false), /زیرمجموعه/);
    database.setLocationActive(street.id,false);
    database.setLocationActive(neighborhood.id,false);
    database.setLocationActive(district.id,false);
    database.setLocationActive(city.id,false);
    database.setLocationActive(county.id,false);
    database.setLocationActive(province.id,false);
    assert.strictEqual(database.listLocationCatalog(false).length, 0);
    assert.strictEqual(database.listLocationCatalog(true).length, 6);

    const customField = database.saveCustomField({
      entityType:'property', key:'passage_width', label:'عرض گذر', fieldType:'number',
      options:[], transactionTypes:['sale'], propertyTypes:['land'], usageTypes:[],
      sortOrder:12, isRequired:true
    });
    assert.ok(customField.saved);
    let propertyFields = database.listCustomFields('property',false);
    assert.strictEqual(propertyFields.length,1);
    assert.strictEqual(propertyFields[0].label,'عرض گذر');
    assert.strictEqual(propertyFields[0].isRequired,true);
    assert.deepStrictEqual(propertyFields[0].transactionTypes,['sale']);
    assert.strictEqual(database.listCustomFields('demand',false).length,0);
    assert.strictEqual(database.listCustomFields('all',false).length,1);
    assert.strictEqual(database.listCustomFields('all',true).length,1);
    assert.throws(()=>database.saveCustomField({entityType:'property',key:'bad key',label:'شناسه نامعتبر',fieldType:'text'}),/شناسه/);
    assert.throws(()=>database.saveCustomField({entityType:'property',key:'choice_field',label:'گزینه',fieldType:'select',options:[]}),/گزینه/);
    database.setCustomFieldActive(propertyFields[0].id,false);
    assert.strictEqual(database.listCustomFields('property',false).length,0);
    assert.strictEqual(database.listCustomFields('property',true).length,1);
    database.setCustomFieldActive(propertyFields[0].id,true);
    assert.strictEqual(database.listCustomFields('property',false).length,1);

    const draft = database.saveDraft({
      type: 'property',
      step: 2,
      payload: { transactionType: 'sale', property: { propertyType: 'apartment' }, details: { frontage: 6.5, documentStatus: 'six_dang', facilities: ['بر خیابان'] }, customFields:{property:{passage_width:8.5,has_water:true}} }
    });
    assert.ok(draft.id);
    assert.strictEqual(database.getDraft(draft.id).step, 2);
    assert.strictEqual(database.getDraft(draft.id).payload.details.frontage, 6.5);
    assert.deepStrictEqual(database.getDraft(draft.id).payload.details.facilities, ['بر خیابان']);
    assert.strictEqual(database.getDraft(draft.id).payload.customFields.property.passage_width,8.5);
    assert.strictEqual(database.getDraft(draft.id).payload.customFields.property.has_water,true);
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
    console.log('Stage 09 database smoke test: PASS');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
