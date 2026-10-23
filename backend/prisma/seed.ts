import { PrismaClient, Role, OrderStatus, OrderPriority, MovementType, OrderItemStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing records safely in foreign key order
  await prisma.scanEvent.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.shelfBin.deleteMany();
  await prisma.row.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned previous seed data.');

  // 1. Create Users with hashed passwords
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin@123', salt);
  const managerPasswordHash = await bcrypt.hash('Manager@123', salt);
  const pickerPasswordHash = await bcrypt.hash('Picker@123', salt);
  const auditorPasswordHash = await bcrypt.hash('Auditor@123', salt);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@stockflow.internal',
      name: 'Sarah Connor (System Admin)',
      password: passwordHash,
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@stockflow.internal',
      name: 'Marcus Vance (Warehouse Manager)',
      password: managerPasswordHash,
      role: Role.MANAGER,
    },
  });

  const picker = await prisma.user.create({
    data: {
      email: 'picker@stockflow.internal',
      name: 'Alex Rivera (Fulfillment Lead)',
      password: pickerPasswordHash,
      role: Role.PICKER,
    },
  });

  const auditor = await prisma.user.create({
    data: {
      email: 'auditor@stockflow.internal',
      name: 'Elena Rostova (Compliance Auditor)',
      password: auditorPasswordHash,
      role: Role.AUDITOR,
    },
  });

  console.log('👥 Created users for ADMIN, MANAGER, PICKER, AUDITOR');

  // 2. Create Warehouses
  const wh01 = await prisma.warehouse.create({
    data: {
      code: 'WH01',
      name: 'Central Logistics Hub',
      address: '742 Evergreen Logistics Blvd, Chicago, IL 60601',
    },
  });

  const wh02 = await prisma.warehouse.create({
    data: {
      code: 'WH02',
      name: 'West Coast Regional Depot',
      address: '1080 Terminal Way, Seattle, WA 98101',
    },
  });

  console.log('🏢 Created Warehouses WH01 and WH02');

  // 3. Create Rows & Shelves for WH01
  const rowsWH01Data = ['R01', 'R02', 'R03', 'R04', 'R05'];
  const wh01BinsMap: Record<string, string> = {}; // key: "R03-S14" -> binId

  for (const rCode of rowsWH01Data) {
    const row = await prisma.row.create({
      data: {
        code: rCode,
        warehouseId: wh01.id,
      },
    });

    // Create shelves S01 to S15 for each row
    const shelfCodes = Array.from({ length: 15 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`);
    // Also add special bin C02 on Row 1 (matching frontend smart picking)
    if (rCode === 'R01') {
      shelfCodes.push('C02');
    }

    for (const sCode of shelfCodes) {
      const qrCode = `SHELF-${wh01.code}-${rCode}-${sCode}`;
      const bin = await prisma.shelfBin.create({
        data: {
          code: sCode,
          qrCode,
          rowId: row.id,
          zone: rCode <= 'R02' ? 'FAST_PICK' : 'STANDARD_STORAGE',
          capacity: 100,
        },
      });
      wh01BinsMap[`${rCode}-${sCode}`] = bin.id;
    }
  }

  // Rows & Shelves for WH02
  const rowsWH02Data = ['R01', 'R02', 'R03'];
  const wh02BinsMap: Record<string, string> = {};

  for (const rCode of rowsWH02Data) {
    const row = await prisma.row.create({
      data: {
        code: rCode,
        warehouseId: wh02.id,
      },
    });

    const shelfCodes = Array.from({ length: 10 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`);
    for (const sCode of shelfCodes) {
      const qrCode = `SHELF-${wh02.code}-${rCode}-${sCode}`;
      const bin = await prisma.shelfBin.create({
        data: {
          code: sCode,
          qrCode,
          rowId: row.id,
          zone: 'STANDARD_STORAGE',
          capacity: 80,
        },
      });
      wh02BinsMap[`${rCode}-${sCode}`] = bin.id;
    }
  }

  console.log(`📦 Created warehouse hierarchy: rows and ${Object.keys(wh01BinsMap).length + Object.keys(wh02BinsMap).length} shelves/bins`);

  // 4. Create 25+ Products
  const productsRaw = [
    { sku: 'LOG-G502', name: 'Logitech G502 HERO Gaming Mouse', category: 'Peripherals', price: 79.99, minStockLevel: 15 },
    { sku: 'LOG-G305', name: 'Logitech G305 Wireless Mouse', category: 'Peripherals', price: 49.99, minStockLevel: 20 },
    { sku: 'KB-002-C02', name: 'Keychron K2 Mechanical Keyboard RGB', category: 'Peripherals', price: 99.00, minStockLevel: 10 },
    { sku: 'DISP-4K-27', name: 'Dell UltraSharp 27 4K USB-C Monitor', category: 'Monitors', price: 529.99, minStockLevel: 5 },
    { sku: 'DISP-2K-24', name: 'ASUS ProArt Display 24 Full HD', category: 'Monitors', price: 219.00, minStockLevel: 8 },
    { sku: 'HEAD-ANC-700', name: 'Bose Noise Cancelling Headphones 700', category: 'Audio', price: 379.00, minStockLevel: 8 },
    { sku: 'MIC-POD-USB', name: 'Shure MV7+ USB/XLR Podcast Microphone', category: 'Audio', price: 279.00, minStockLevel: 6 },
    { sku: 'CBL-USB-C-2M', name: 'Anker Braided USB-C Cable (2m)', category: 'Cables', price: 14.99, minStockLevel: 40 },
    { sku: 'CBL-HDMI-21', name: 'Belkin Ultra High Speed HDMI 2.1 Cable', category: 'Cables', price: 29.99, minStockLevel: 30 },
    { sku: 'SSD-NVME-2TB', name: 'Samsung 990 PRO NVMe M.2 SSD 2TB', category: 'Storage', price: 179.99, minStockLevel: 12 },
    { sku: 'SSD-EXT-1TB', name: 'SanDisk Extreme Portable SSD 1TB', category: 'Storage', price: 109.99, minStockLevel: 10 },
    { sku: 'RAM-DDR5-32', name: 'Corsair Vengeance DDR5 32GB 6000MHz', category: 'Components', price: 119.99, minStockLevel: 15 },
    { sku: 'CPU-RYZ-7800', name: 'AMD Ryzen 7 7800X3D Gaming Processor', category: 'Components', price: 399.00, minStockLevel: 6 },
    { sku: 'GPU-RTX-4070', name: 'NVIDIA GeForce RTX 4070 SUPER 12GB', category: 'Components', price: 599.99, minStockLevel: 4 },
    { sku: 'PSU-850W-GLD', name: 'Seasonic FOCUS GX-850 Modular 80+ Gold', category: 'Components', price: 149.99, minStockLevel: 8 },
    { sku: 'HUB-TB4-PRO', name: 'CalDigit TS4 Thunderbolt 4 Dock 18-Port', category: 'Accessories', price: 399.95, minStockLevel: 5 },
    { sku: 'CAM-4K-STRM', name: 'Elgato Facecam Pro 4K60 Streaming Cam', category: 'Cameras', price: 299.99, minStockLevel: 6 },
    { sku: 'LGT-KEY-PRO', name: 'Elgato Key Light Studio LED Panel', category: 'Lighting', price: 179.99, minStockLevel: 8 },
    { sku: 'ARM-DESK-MNT', name: 'Ergotron LX Desk Monitor Arm', category: 'Accessories', price: 189.50, minStockLevel: 10 },
    { sku: 'MAT-DESK-XL', name: 'Grovemade Wool Felt Desk Pad XL', category: 'Accessories', price: 65.00, minStockLevel: 25 },
    { sku: 'ROUT-WIFI-6E', name: 'ASUS ROG Rapture GT-AXE16000 Router', category: 'Networking', price: 549.99, minStockLevel: 4 },
    { sku: 'SW-24P-POE', name: 'Ubiquiti UniFi Pro 24-Port PoE Switch', category: 'Networking', price: 699.00, minStockLevel: 3 },
    { sku: 'UPS-1500VA', name: 'CyberPower CP1500PFCLCD Sinewave UPS', category: 'Power', price: 219.95, minStockLevel: 5 },
    { sku: 'CHAIR-ERG-01', name: 'Herman Miller Aeron Ergonomic Chair', category: 'Furniture', price: 1295.00, minStockLevel: 2 },
    { sku: 'BOX-CORR-MD', name: 'Corrugated Shipping Boxes Medium (25-pk)', category: 'Packaging', price: 34.50, minStockLevel: 50 },
    { sku: 'TAPE-PKG-CLR', name: 'Scotch Heavy Duty Packaging Tape (6-pk)', category: 'Packaging', price: 22.99, minStockLevel: 40 },
    { sku: 'BUB-WRAP-100', name: 'Air Cushion Bubble Wrap Roll 100ft', category: 'Packaging', price: 18.75, minStockLevel: 35 },
  ];

  const productMap: Record<string, any> = {};

  for (const p of productsRaw) {
    const created = await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        category: p.category,
        price: p.price,
        minStockLevel: p.minStockLevel,
        unit: 'pcs',
        qrCode: `SKU-${p.sku}`,
        barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        description: `Premium grade ${p.name} configured for high-throughput enterprise fulfillment.`,
      },
    });
    productMap[p.sku] = created;
  }

  console.log(`🏷️ Created ${productsRaw.length} products`);

  // 5. Stock Inventory
  // Specific problem requirement:
  // LOG-G502 in WH01 Row R03 Shelf S14 has 27 units!
  const inventorySetup = [
    { sku: 'LOG-G502', binKey: 'R03-S14', qty: 27 },
    { sku: 'LOG-G502', binKey: 'R02-S05', qty: 15 },
    { sku: 'LOG-G305', binKey: 'R03-S12', qty: 34 },
    { sku: 'KB-002-C02', binKey: 'R01-C02', qty: 18 },
    { sku: 'KB-002-C02', binKey: 'R01-S01', qty: 25 },
    { sku: 'DISP-4K-27', binKey: 'R04-S01', qty: 8 },
    { sku: 'DISP-2K-24', binKey: 'R04-S02', qty: 14 },
    { sku: 'HEAD-ANC-700', binKey: 'R02-S01', qty: 19 },
    { sku: 'MIC-POD-USB', binKey: 'R02-S02', qty: 11 },
    { sku: 'CBL-USB-C-2M', binKey: 'R01-S02', qty: 120 },
    { sku: 'CBL-HDMI-21', binKey: 'R01-S03', qty: 85 },
    { sku: 'SSD-NVME-2TB', binKey: 'R02-S08', qty: 42 },
    { sku: 'SSD-EXT-1TB', binKey: 'R02-S09', qty: 28 },
    { sku: 'RAM-DDR5-32', binKey: 'R02-S10', qty: 35 },
    { sku: 'CPU-RYZ-7800', binKey: 'R03-S01', qty: 16 },
    { sku: 'GPU-RTX-4070', binKey: 'R03-S02', qty: 7 },
    { sku: 'PSU-850W-GLD', binKey: 'R03-S08', qty: 22 },
    { sku: 'HUB-TB4-PRO', binKey: 'R02-S11', qty: 9 },
    { sku: 'CAM-4K-STRM', binKey: 'R02-S04', qty: 14 },
    { sku: 'LGT-KEY-PRO', binKey: 'R02-S06', qty: 12 },
    { sku: 'ARM-DESK-MNT', binKey: 'R04-S08', qty: 18 },
    { sku: 'MAT-DESK-XL', binKey: 'R01-S08', qty: 50 },
    { sku: 'ROUT-WIFI-6E', binKey: 'R05-S01', qty: 6 },
    { sku: 'SW-24P-POE', binKey: 'R05-S02', qty: 4 },
    { sku: 'UPS-1500VA', binKey: 'R05-S05', qty: 7 },
    // Intentionally low stock products for dashboard alerts:
    { sku: 'CHAIR-ERG-01', binKey: 'R05-S10', qty: 1 }, // minStockLevel 2
    { sku: 'BOX-CORR-MD', binKey: 'R01-S14', qty: 18 },  // minStockLevel 50 -> low stock
    { sku: 'TAPE-PKG-CLR', binKey: 'R01-S15', qty: 12 },  // minStockLevel 40 -> low stock
  ];

  for (const inv of inventorySetup) {
    const prod = productMap[inv.sku];
    const binId = wh01BinsMap[inv.binKey];
    if (!prod || !binId) continue;

    await prisma.inventory.create({
      data: {
        productId: prod.id,
        binId,
        quantity: inv.qty,
      },
    });

    // Record initial INWARD stock movement
    await prisma.stockMovement.create({
      data: {
        productId: prod.id,
        type: MovementType.INWARD,
        quantity: inv.qty,
        toBinId: binId,
        userId: manager.id,
        reason: 'Initial warehouse stocking & cycle count',
      },
    });
  }

  // Stock a few items in WH02 as well
  const wh02Inv = [
    { sku: 'LOG-G502', binKey: 'R01-S01', qty: 18 },
    { sku: 'CBL-USB-C-2M', binKey: 'R01-S02', qty: 60 },
    { sku: 'SSD-NVME-2TB', binKey: 'R02-S01', qty: 14 },
  ];

  for (const inv of wh02Inv) {
    const prod = productMap[inv.sku];
    const binId = wh02BinsMap[inv.binKey];
    if (!prod || !binId) continue;

    await prisma.inventory.create({
      data: {
        productId: prod.id,
        binId,
        quantity: inv.qty,
      },
    });

    await prisma.stockMovement.create({
      data: {
        productId: prod.id,
        type: MovementType.INWARD,
        quantity: inv.qty,
        toBinId: binId,
        userId: manager.id,
        reason: 'WH02 Regional depot initial allocation',
      },
    });
  }

  console.log('📊 Stocked inventories and recorded initial INWARD movements');

  // 6. Create Realistic Orders
  // Order 1: PENDING high-priority order ready to be picked
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-8801',
      customerName: 'AeroTech Systems Inc.',
      status: OrderStatus.PENDING,
      priority: OrderPriority.HIGH,
      assignedToUserId: picker.id,
      items: {
        create: [
          {
            productId: productMap['LOG-G502'].id,
            quantity: 2,
            pickedQuantity: 0,
            status: OrderItemStatus.PENDING,
          },
          {
            productId: productMap['KB-002-C02'].id,
            quantity: 1,
            pickedQuantity: 0,
            status: OrderItemStatus.PENDING,
          },
        ],
      },
    },
  });

  // Order 2: PICKING order in progress
  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-8802',
      customerName: 'Horizon Creative Studio',
      status: OrderStatus.PICKING,
      priority: OrderPriority.URGENT,
      assignedToUserId: picker.id,
      items: {
        create: [
          {
            productId: productMap['DISP-4K-27'].id,
            quantity: 1,
            pickedQuantity: 1,
            status: OrderItemStatus.PICKED,
          },
          {
            productId: productMap['CBL-HDMI-21'].id,
            quantity: 2,
            pickedQuantity: 0,
            status: OrderItemStatus.PENDING,
          },
        ],
      },
    },
  });

  // Order 3: COMPLETED order
  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-8799',
      customerName: 'NexGen Cloud Infrastructure',
      status: OrderStatus.COMPLETED,
      priority: OrderPriority.NORMAL,
      assignedToUserId: picker.id,
      items: {
        create: [
          {
            productId: productMap['SSD-NVME-2TB'].id,
            quantity: 4,
            pickedQuantity: 4,
            status: OrderItemStatus.PICKED,
          },
        ],
      },
    },
  });

  console.log('📋 Created orders ORD-2026-8801, ORD-2026-8802, ORD-2026-8799');
  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
