/* eslint-disable no-console */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Categories that are simple groupings of multiple old Excel/P&L labels.
// `mergedFrom` is informational only (kept as a comment source, not stored).
const CATEGORY_GROUPS = [
  { name: 'Rent / House Rental' },
  { name: 'Utilities' },
  { name: 'Office Supplies' },
  { name: 'Mesra / Shop Supplies' },
  { name: 'Mileage Claim' },
  { name: 'Training / Course & Training' },
  { name: 'Clinic / Medical Fee' },
  { name: 'Uniform Refund / Uniform' },
  { name: 'Bonus' },
  { name: 'HSE' },
  { name: 'Gardening' },
  { name: 'Printing & Stationery' },
  { name: 'Staff Refreshment / Staff Event' },
  { name: 'Donation & Gift / Sumbangan' },
  { name: 'Staff Salaries & Wages' },
  { name: 'EPF' },
  { name: 'SOCSO' },
  { name: 'Accounting Fee' },
  { name: 'Bank Charges' },
  { name: 'Credit Card Charges' },
  { name: 'Depreciation' },
  { name: 'Equipment Rental' },
  { name: 'Fuel' },
  { name: 'Insurances / Insurance & Roadtax' },
  { name: 'Licence Fee / Operating License Fee' },
  { name: 'Postage & Courier' },
  { name: 'Petrol, Toll & Parking' },
  { name: 'Telephone' },
  { name: 'Travelling' },
  { name: 'Upkeep / Repairs' },
  { name: 'Security Fee' },
  { name: 'Pest Control' },
  { name: 'Registration Fee' },
  { name: 'Stamping Fees' },
  { name: 'Subscription Fee' },
  { name: 'Sewerage Charges' },
  { name: 'Transportation' },
  { name: 'Royalty' },
  { name: 'ZED Charges' },
  { name: 'Service Charges' },
  { name: 'Shop Purchases' },
  { name: 'Penalty Fee' },
  { name: 'Accommodation' },
  { name: 'Advertising' },
  { name: 'Owner Salary' },
  { name: 'Wages' },
  { name: 'Interest on Hire Purchase' },
  { name: 'Others' },
];

// Dynamic extra fields keyed by category name. Categories not listed here
// have no extra fields (besides the built-in remarks on the transaction).
const FIELD_DEFS = {
  'Mileage Claim': [
    { fieldName: 'Staff Name',          fieldKey: 'staff_name',       fieldType: 'text',     isRequired: true },
    { fieldName: 'Vehicle Type',        fieldKey: 'vehicle_type',     fieldType: 'text' },          // 'car' | 'motorcycle'
    { fieldName: 'Vehicle Brand',       fieldKey: 'car_brand',        fieldType: 'text' },
    { fieldName: 'License Plate',       fieldKey: 'license_plate',    fieldType: 'text',     isRequired: true },
    { fieldName: 'Objectives',          fieldKey: 'objectives',       fieldType: 'textarea' },
    { fieldName: 'Route Segments',      fieldKey: 'mileage_segments', fieldType: 'textarea' }, // JSON from route builder
    { fieldName: 'Total Distance (km)', fieldKey: 'total_distance_km',fieldType: 'number',   isRequired: true, placeholder: 'e.g. 42.5' },
  ],
  'Training / Course & Training': [
    { fieldName: 'Staff Name', fieldKey: 'staff_name', fieldType: 'text', isRequired: true },
    { fieldName: 'Training Provider', fieldKey: 'training_provider', fieldType: 'text' },
    { fieldName: 'Training Name', fieldKey: 'training_name', fieldType: 'text', isRequired: true },
    { fieldName: 'Location', fieldKey: 'location', fieldType: 'text' },
    { fieldName: 'Date of Training', fieldKey: 'training_date', fieldType: 'date' },
  ],
  'Clinic / Medical Fee': [
    { fieldName: 'Staff Name', fieldKey: 'staff_name', fieldType: 'text', isRequired: true },
    { fieldName: 'Clinic Name', fieldKey: 'clinic_name', fieldType: 'text' },
    { fieldName: 'Reason', fieldKey: 'reason', fieldType: 'textarea' },
  ],
  'Uniform Refund / Uniform': [
    { fieldName: 'Staff Name', fieldKey: 'staff_name', fieldType: 'text', isRequired: true },
    { fieldName: 'Quantity', fieldKey: 'quantity', fieldType: 'number' },
    { fieldName: 'Reason', fieldKey: 'reason', fieldType: 'textarea' },
  ],
  Bonus: [
    { fieldName: 'Staff Name', fieldKey: 'staff_name', fieldType: 'text', isRequired: true },
    { fieldName: 'Month/Period', fieldKey: 'period', fieldType: 'text' },
    { fieldName: 'Remarks', fieldKey: 'bonus_remarks', fieldType: 'textarea' },
  ],
  'Staff Refreshment / Staff Event': [
    { fieldName: 'Event Name', fieldKey: 'event_name', fieldType: 'text', isRequired: true },
    { fieldName: 'Number of Pax', fieldKey: 'num_pax', fieldType: 'number' },
    { fieldName: 'Remarks', fieldKey: 'event_remarks', fieldType: 'textarea' },
  ],
  'Office Supplies': [
    { fieldName: 'Item Description', fieldKey: 'item_description', fieldType: 'text', isRequired: true },
    { fieldName: 'Quantity', fieldKey: 'quantity', fieldType: 'number' },
    { fieldName: 'Supplier', fieldKey: 'supplier', fieldType: 'text' },
  ],
  'Mesra / Shop Supplies': [
    { fieldName: 'Item Description', fieldKey: 'item_description', fieldType: 'text', isRequired: true },
    { fieldName: 'Quantity', fieldKey: 'quantity', fieldType: 'number' },
    { fieldName: 'Supplier', fieldKey: 'supplier', fieldType: 'text' },
  ],
  HSE: [
    { fieldName: 'Item/Equipment Name', fieldKey: 'item_name', fieldType: 'text', isRequired: true },
    { fieldName: 'Description', fieldKey: 'description', fieldType: 'textarea' },
    { fieldName: 'Supplier', fieldKey: 'supplier', fieldType: 'text' },
  ],
  'Upkeep / Repairs': [
    { fieldName: 'Item/Equipment Name', fieldKey: 'item_name', fieldType: 'text', isRequired: true },
    { fieldName: 'Description', fieldKey: 'description', fieldType: 'textarea' },
    { fieldName: 'Supplier', fieldKey: 'supplier', fieldType: 'text' },
  ],
  Gardening: [
    { fieldName: 'Item Description', fieldKey: 'item_description', fieldType: 'text' },
    { fieldName: 'Supplier', fieldKey: 'supplier', fieldType: 'text' },
  ],
  'Printing & Stationery': [
    { fieldName: 'Item Description', fieldKey: 'item_description', fieldType: 'text', isRequired: true },
    { fieldName: 'Quantity', fieldKey: 'quantity', fieldType: 'number' },
  ],
  'Donation & Gift / Sumbangan': [
    { fieldName: 'Recipient/Organization', fieldKey: 'recipient', fieldType: 'text', isRequired: true },
    { fieldName: 'Purpose', fieldKey: 'purpose', fieldType: 'textarea' },
  ],
  Others: [{ fieldName: 'Remarks', fieldKey: 'other_remarks', fieldType: 'textarea' }],
};

async function main() {
  console.log('Seeding users...');

  const managerPasswordHash = await bcrypt.hash(process.env.SEED_MANAGER_PASSWORD || 'ChangeMe123!', 12);
  const staffPasswordHash = await bcrypt.hash(process.env.SEED_STAFF_PASSWORD || 'ChangeMe123!', 12);

  await prisma.user.upsert({
    where: { username: process.env.SEED_MANAGER_USERNAME || 'manager' },
    update: {},
    create: {
      username: process.env.SEED_MANAGER_USERNAME || 'manager',
      email: process.env.SEED_MANAGER_EMAIL || 'manager@petronas-station.local',
      passwordHash: managerPasswordHash,
      role: 'manager',
      fullName: 'Station Manager',
    },
  });

  await prisma.user.upsert({
    where: { username: process.env.SEED_STAFF_USERNAME || 'staff' },
    update: {},
    create: {
      username: process.env.SEED_STAFF_USERNAME || 'staff',
      email: process.env.SEED_STAFF_EMAIL || 'staff@petronas-station.local',
      passwordHash: staffPasswordHash,
      role: 'staff',
      fullName: 'Petty Cash Custodian',
    },
  });

  console.log('Seeding categories...');

  for (let i = 0; i < CATEGORY_GROUPS.length; i += 1) {
    const group = CATEGORY_GROUPS[i];

    const category = await prisma.category.upsert({
      where: { id: `seed-${slugify(group.name)}` },
      update: { name: group.name, displayOrder: i },
      create: {
        id: `seed-${slugify(group.name)}`,
        name: group.name,
        displayOrder: i,
      },
    });

    const fields = FIELD_DEFS[group.name];
    if (fields) {
      for (let j = 0; j < fields.length; j += 1) {
        const f = fields[j];
        const existing = await prisma.categoryField.findFirst({
          where: { categoryId: category.id, fieldKey: f.fieldKey },
        });
        if (!existing) {
          await prisma.categoryField.create({
            data: {
              categoryId: category.id,
              fieldName: f.fieldName,
              fieldKey: f.fieldKey,
              fieldType: f.fieldType,
              isRequired: f.isRequired || false,
              displayOrder: j,
              placeholder: f.placeholder || null,
            },
          });
        }
      }
    }
  }

  console.log(`Seeded ${CATEGORY_GROUPS.length} categories.`);
  console.log('Done.');
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
