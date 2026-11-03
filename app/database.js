const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const initSqlJs = require('sql.js/dist/sql-wasm-inline.js');

let db;
let dbPath;

const now = () => new Date().toISOString();
const makeId = () => crypto.randomUUID();
const asText = value => value == null ? '' : String(value).trim();
const asNumber = value => {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const asInteger = value => {
  const number = asNumber(value);
  return number == null ? null : Math.trunc(number);
};
const asBool = value => value ? 1 : 0;
const jsonText = value => JSON.stringify(value == null ? {} : value);

function run(sql, params = []) {
  db.run(sql, params);
}

function one(sql, params = []) {
  const statement = db.prepare(sql);
  try {
    statement.bind(params);
    return statement.step() ? statement.getAsObject() : null;
  } finally {
    statement.free();
  }
}

function many(sql, params = []) {
  const statement = db.prepare(sql);
  const rows = [];
  try {
    statement.bind(params);
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
}

function persist() {
  const temporaryPath = dbPath + '.writing';
  const previousPath = dbPath + '.previous';
  fs.writeFileSync(temporaryPath, Buffer.from(db.export()));

  let movedPrevious = false;
  try {
    if (fs.existsSync(previousPath)) fs.unlinkSync(previousPath);
    if (fs.existsSync(dbPath)) {
      fs.renameSync(dbPath, previousPath);
      movedPrevious = true;
    }
    fs.renameSync(temporaryPath, dbPath);
    if (movedPrevious && fs.existsSync(previousPath)) fs.unlinkSync(previousPath);
  } catch (error) {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    if (movedPrevious && !fs.existsSync(dbPath) && fs.existsSync(previousPath)) {
      fs.renameSync(previousPath, dbPath);
    }
    throw error;
  }
}

async function initialize(userDataPath) {
  dbPath = path.join(userDataPath, 'amlak-salam-data.sqlite');
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const bytes = fs.readFileSync(dbPath);
    db = new SQL.Database(bytes);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON;');
  const schemaPath = path.join(__dirname, 'schema.sql');
  db.run(fs.readFileSync(schemaPath, 'utf8'));
  persist();
  return { database: path.basename(dbPath), schemaVersion: one("SELECT value FROM app_meta WHERE key='schema_version'").value };
}

function saveDraft(input = {}) {
  const recordType = input.type === 'property' ? 'property' : input.type === 'demand' ? 'demand' : null;
  if (!recordType) throw new Error('نوع پیش‌نویس معتبر نیست.');
  const payload = input.payload && typeof input.payload === 'object' ? input.payload : {};
  const payloadJson = jsonText(payload);
  if (Buffer.byteLength(payloadJson, 'utf8') > 1024 * 1024) throw new Error('حجم پیش‌نویس بیش از حد مجاز است.');
  const id = asText(input.id) || makeId();
  const step = Math.max(0, Math.min(5, asInteger(input.step) || 0));
  const timestamp = now();
  run(`INSERT INTO record_drafts(id,record_type,step_index,payload_json,created_at,updated_at)
       VALUES(?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET record_type=excluded.record_type, step_index=excluded.step_index,
       payload_json=excluded.payload_json, updated_at=excluded.updated_at`,
    [id, recordType, step, payloadJson, timestamp, timestamp]);
  persist();
  return { id, type: recordType, step, updatedAt: timestamp };
}

function listDrafts() {
  return many('SELECT id, record_type AS type, step_index AS step, created_at AS createdAt, updated_at AS updatedAt FROM record_drafts ORDER BY updated_at DESC');
}

function getDraft(id) {
  const row = one('SELECT id, record_type AS type, step_index AS step, payload_json, updated_at AS updatedAt FROM record_drafts WHERE id=?', [asText(id)]);
  if (!row) return null;
  return { id: row.id, type: row.type, step: row.step, payload: JSON.parse(row.payload_json), updatedAt: row.updatedAt };
}

function deleteDraft(id) {
  run('DELETE FROM record_drafts WHERE id=?', [asText(id)]);
  persist();
  return { deleted: true };
}

function saveContact(contact, role) {
  const fullName = asText(contact && contact.fullName);
  const mobile = asText(contact && contact.mobile);
  if (!fullName && !mobile) return null;
  const id = makeId();
  const timestamp = now();
  run(`INSERT INTO contacts(id,full_name,mobile,phone,email,contact_role,public_notes,confidential_notes,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?)`,
    [id, fullName, mobile, asText(contact.phone), asText(contact.email), role,
     asText(contact.publicNotes), asText(contact.confidentialNotes), timestamp, timestamp]);
  return id;
}

function recordCode(prefix) {
  const date = new Date();
  const stamp = date.getFullYear().toString() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
  return prefix + '-' + stamp + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

function submitRecord(input = {}) {
  const type = input.type === 'property' ? 'property' : input.type === 'demand' ? 'demand' : null;
  if (!type) throw new Error('نوع پرونده معتبر نیست.');
  const payload = input.payload && typeof input.payload === 'object' ? input.payload : {};
  const transactionType = asText(payload.transactionType);
  const property = payload.property || {};
  const location = payload.location || {};
  const details = payload.details || {};
  const pricing = payload.pricing || {};
  const conditions = payload.conditions || {};
  const notes = payload.notes || {};
  const contact = payload.contact || {};
  const timestamp = now();
  const id = makeId();

  if (!asText(property.propertyType)) throw new Error('نوع ملک را انتخاب کنید.');
  if (!asText(location.city)) throw new Error('شهر ملک را مشخص کنید.');
  if (!asText(contact.fullName) && !asText(contact.mobile)) throw new Error(type === 'property' ? 'نام یا شماره تماس مالک را وارد کنید.' : 'نام یا شماره تماس متقاضی را وارد کنید.');

  if (type === 'property') {
    if (!transactionType) throw new Error('نوع معامله را انتخاب کنید.');
    const contactId = saveContact(contact, 'owner');
    const code = recordCode('AS-P');
    run(`INSERT INTO property_records(
      id,record_code,transaction_type,property_type,usage_type,province,county,city,district,neighborhood,street,address,
      area_sqm,land_area_sqm,construction_year,floor_number,total_floors,unit_count,bedrooms,elevator,parking_type,storage,direct_light,
      facilities_json,public_price,redline_price,expert_price_suggestion,deposit_amount,monthly_rent,public_notes,confidential_notes,
      owner_contact_id,payload_json,status,created_at,updated_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id,code,transactionType,asText(property.propertyType),asText(property.usageType),asText(location.province),asText(location.county),
     asText(location.city),asText(location.district),asText(location.neighborhood),asText(location.street),asText(location.address),
     asNumber(details.area),asNumber(details.landArea),asInteger(details.constructionYear),asInteger(details.floorNumber),
     asInteger(details.totalFloors),asInteger(details.unitCount),asInteger(details.bedrooms),asBool(details.elevator),
     asText(details.parkingType),asBool(details.storage),asBool(details.directLight),jsonText(details.facilities || []),
     asNumber(pricing.publicPrice),asNumber(pricing.redlinePrice),asNumber(pricing.expertPrice),
     asNumber(conditions.deposit),asNumber(conditions.monthlyRent),asText(notes.public),asText(notes.confidential),
     contactId,jsonText(payload),'registered',timestamp,timestamp]);
    run('INSERT INTO audit_events(id,entity_type,entity_id,action,details_json,created_at) VALUES(?,?,?,?,?,?)',
      [makeId(),'property',id,'created',jsonText({recordCode:code}),timestamp]);
    if (input.draftId) run('DELETE FROM record_drafts WHERE id=?',[asText(input.draftId)]);
    persist();
    return { id, code, type, status: 'registered' };
  }

  if (!transactionType) throw new Error('نوع تقاضا را انتخاب کنید.');
  const contactId = saveContact(contact, 'applicant');
  const code = recordCode('AS-D');
  run(`INSERT INTO demand_records(
    id,record_code,request_type,property_type,usage_type,province,county,city,district,neighborhood,
    area_min,area_max,bedrooms_min,budget_min,budget_max,deposit_min,deposit_max,monthly_rent_min,monthly_rent_max,
    required_facilities_json,applicant_contact_id,public_notes,confidential_notes,payload_json,status,created_at,updated_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  [id,code,transactionType,asText(property.propertyType),asText(property.usageType),asText(location.province),asText(location.county),
   asText(location.city),asText(location.district),asText(location.neighborhood),asNumber(details.areaMin),asNumber(details.areaMax),
   asInteger(details.bedroomsMin),asNumber(pricing.budgetMin),asNumber(pricing.budgetMax),asNumber(conditions.depositMin),
   asNumber(conditions.depositMax),asNumber(conditions.rentMin),asNumber(conditions.rentMax),jsonText(details.facilities || []),
   contactId,asText(notes.public),asText(notes.confidential),jsonText(payload),'registered',timestamp,timestamp]);
  run('INSERT INTO audit_events(id,entity_type,entity_id,action,details_json,created_at) VALUES(?,?,?,?,?,?)',
    [makeId(),'demand',id,'created',jsonText({recordCode:code}),timestamp]);
  if (input.draftId) run('DELETE FROM record_drafts WHERE id=?',[asText(input.draftId)]);
  persist();
  return { id, code, type, status: 'registered' };
}

function listRecords(type = 'property') {
  if (type === 'demand') {
    return many(`SELECT id,record_code AS code,request_type AS transactionType,property_type AS propertyType,
      city,neighborhood,budget_min AS budgetMin,budget_max AS budgetMax,status,created_at AS createdAt
      FROM demand_records ORDER BY created_at DESC LIMIT 100`);
  }
  return many(`SELECT id,record_code AS code,transaction_type AS transactionType,property_type AS propertyType,
    city,neighborhood,area_sqm AS area,public_price AS publicPrice,status,created_at AS createdAt
    FROM property_records ORDER BY created_at DESC LIMIT 100`);
}

const LOCATION_LEVELS = ['province','county','city','district','neighborhood','street','village'];
const LOCATION_PARENT_LEVELS = {
  province: [],
  county: ['province'],
  city: ['county'],
  district: ['city'],
  neighborhood: ['city','district'],
  street: ['city','district','neighborhood'],
  village: ['city','county']
};
const LOCATION_LEVEL_LABELS = {
  province: 'استان', county: 'شهرستان', city: 'شهر', district: 'منطقه',
  neighborhood: 'محله', street: 'خیابان / بلوار / میدان', village: 'روستا'
};

function listLocations(parentId = null, includeInactive = false) {
  const where = [];
  const params = [];
  if (parentId === null) where.push('parent_id IS NULL');
  else { where.push('parent_id=?'); params.push(asText(parentId)); }
  if (!includeInactive) where.push('is_active=1');
  return many(`SELECT id,parent_id AS parentId,level,official_name AS officialName,
    common_name AS commonName,is_active AS isActive,sort_order AS sortOrder,created_at AS createdAt
    FROM locations WHERE ${where.join(' AND ')} ORDER BY sort_order,official_name COLLATE NOCASE`, params);
}

function listLocationChildren(parentId, includeInactive = false) {
  const where = ['parent_id=?'];
  const params = [asText(parentId)];
  if (!includeInactive) where.push('is_active=1');
  return many(`SELECT id,parent_id AS parentId,level,official_name AS officialName,
    common_name AS commonName,is_active AS isActive,sort_order AS sortOrder
    FROM locations WHERE ${where.join(' AND ')} ORDER BY sort_order,official_name COLLATE NOCASE`, params);
}

function saveLocation(input = {}) {
  const id = asText(input.id);
  const level = asText(input.level);
  const officialName = asText(input.officialName);
  const commonName = asText(input.commonName);
  const parentId = asText(input.parentId) || null;
  const sortOrder = asInteger(input.sortOrder) || 0;
  if (!LOCATION_LEVELS.includes(level)) throw new Error('سطح موقعیت معتبر نیست.');
  if (!officialName) throw new Error('نام رسمی موقعیت را وارد کنید.');
  if (officialName.length > 100 || commonName.length > 100) throw new Error('نام موقعیت نباید بیش از ۱۰۰ نویسه باشد.');
  const allowedParents = LOCATION_PARENT_LEVELS[level];
  if (allowedParents.length === 0 && parentId) throw new Error('استان نباید والد داشته باشد.');
  if (allowedParents.length > 0 && !parentId) throw new Error('برای این سطح، انتخاب موقعیت بالادستی الزامی است.');
  if (parentId) {
    const parent = one('SELECT id,level FROM locations WHERE id=? AND is_active=1', [parentId]);
    if (!parent || !allowedParents.includes(parent.level)) throw new Error('موقعیت بالادستی با سطح انتخاب‌شده سازگار نیست.');
  }
  const timestamp = now();
  if (id) {
    const existing = one('SELECT id,level FROM locations WHERE id=?', [id]);
    if (!existing) throw new Error('موقعیت برای ویرایش پیدا نشد.');
    if (existing.level !== level) throw new Error('سطح موقعیت پس از ثبت قابل تغییر نیست؛ موقعیت جدید تعریف کنید.');
    if (id === parentId) throw new Error('موقعیت نمی‌تواند والد خودش باشد.');
    run('UPDATE locations SET parent_id=?,official_name=?,common_name=?,sort_order=? WHERE id=?',
      [parentId,officialName,commonName,sortOrder,id]);
  } else {
    const newId = makeId();
    run(`INSERT INTO locations(id,parent_id,level,official_name,common_name,is_active,sort_order,created_at)
      VALUES(?,?,?,?,?,1,?,?)`, [newId,parentId,level,officialName,commonName,sortOrder,timestamp]);
    persist();
    return { id:newId, level, officialName, commonName, parentId };
  }
  persist();
  return { id, level, officialName, commonName, parentId };
}

function setLocationActive(id, isActive) {
  const locationId = asText(id);
  if (!one('SELECT id FROM locations WHERE id=?',[locationId])) throw new Error('موقعیت پیدا نشد.');
  if (!isActive) {
    const activeChildren = one('SELECT COUNT(*) AS count FROM locations WHERE parent_id=? AND is_active=1',[locationId]).count;
    if (activeChildren > 0) throw new Error('ابتدا موقعیت‌های زیرمجموعه را غیرفعال کنید.');
  }
  run('UPDATE locations SET is_active=? WHERE id=?',[isActive?1:0,locationId]);
  persist();
  return { id:locationId, isActive:Boolean(isActive) };
}

function locationLevelLabels() {
  return LOCATION_LEVELS.map(level=>({value:level,label:LOCATION_LEVEL_LABELS[level],parents:LOCATION_PARENT_LEVELS[level]}));
}

function dashboardStats() {
  return {
    properties: one("SELECT COUNT(*) AS count FROM property_records WHERE status='registered'").count,
    demands: one("SELECT COUNT(*) AS count FROM demand_records WHERE status='registered'").count,
    drafts: one('SELECT COUNT(*) AS count FROM record_drafts').count
  };
}

module.exports = { initialize, saveDraft, listDrafts, getDraft, deleteDraft, submitRecord, listRecords, dashboardStats, listLocations, listLocationChildren, saveLocation, setLocationActive, locationLevelLabels };
