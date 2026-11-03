PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  mobile TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  contact_role TEXT NOT NULL DEFAULT 'both',
  public_notes TEXT NOT NULL DEFAULT '',
  confidential_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES locations(id) ON DELETE RESTRICT,
  level TEXT NOT NULL CHECK(level IN ('province','county','city','district','neighborhood','street','village')),
  official_name TEXT NOT NULL,
  common_name TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(parent_id, level, official_name, common_name)
);

CREATE TABLE IF NOT EXISTS property_records (
  id TEXT PRIMARY KEY,
  record_code TEXT NOT NULL UNIQUE,
  transaction_type TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT '',
  usage_type TEXT NOT NULL DEFAULT '',
  province TEXT NOT NULL DEFAULT '',
  county TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  neighborhood TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  area_sqm REAL,
  land_area_sqm REAL,
  construction_year INTEGER,
  floor_number INTEGER,
  total_floors INTEGER,
  unit_count INTEGER,
  bedrooms INTEGER,
  elevator INTEGER NOT NULL DEFAULT 0,
  parking_type TEXT NOT NULL DEFAULT '',
  storage INTEGER NOT NULL DEFAULT 0,
  direct_light INTEGER NOT NULL DEFAULT 0,
  facilities_json TEXT NOT NULL DEFAULT '[]',
  public_price REAL,
  redline_price REAL,
  expert_price_suggestion REAL,
  deposit_amount REAL,
  monthly_rent REAL,
  public_notes TEXT NOT NULL DEFAULT '',
  confidential_notes TEXT NOT NULL DEFAULT '',
  owner_contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demand_records (
  id TEXT PRIMARY KEY,
  record_code TEXT NOT NULL UNIQUE,
  request_type TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT '',
  usage_type TEXT NOT NULL DEFAULT '',
  province TEXT NOT NULL DEFAULT '',
  county TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  neighborhood TEXT NOT NULL DEFAULT '',
  area_min REAL,
  area_max REAL,
  bedrooms_min INTEGER,
  budget_min REAL,
  budget_max REAL,
  deposit_min REAL,
  deposit_max REAL,
  monthly_rent_min REAL,
  monthly_rent_max REAL,
  required_facilities_json TEXT NOT NULL DEFAULT '[]',
  applicant_contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  public_notes TEXT NOT NULL DEFAULT '',
  confidential_notes TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS record_drafts (
  id TEXT PRIMARY KEY,
  record_type TEXT NOT NULL CHECK(record_type IN ('property','demand')),
  step_index INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS field_definitions (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('property','demand','contact')),
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  options_json TEXT NOT NULL DEFAULT '[]',
  is_required INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(entity_type, field_key)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_property_status_created ON property_records(status, created_at);
CREATE INDEX IF NOT EXISTS idx_property_city_type ON property_records(city, property_type, transaction_type);
CREATE INDEX IF NOT EXISTS idx_demand_status_created ON demand_records(status, created_at);
CREATE INDEX IF NOT EXISTS idx_demand_city_type ON demand_records(city, property_type, request_type);
CREATE INDEX IF NOT EXISTS idx_drafts_updated ON record_drafts(updated_at);
CREATE INDEX IF NOT EXISTS idx_contacts_mobile ON contacts(mobile);

INSERT OR IGNORE INTO app_meta(key, value) VALUES ('schema_version', '1');
INSERT OR IGNORE INTO app_meta(key, value) VALUES ('app_data_version', '1');
