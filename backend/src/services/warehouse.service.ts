import prisma from '../config/db';

export class WarehouseService {
  static async createWarehouse(data: { code: string; name: string; address?: string; totalCapacity?: number }) {
    const code = data.code.toUpperCase().trim();
    const existing = await prisma.warehouse.findUnique({
      where: { code },
    });

    if (existing) {
      const error: any = new Error(`Warehouse with code "${code}" already exists`);
      error.code = 'WAREHOUSE_EXISTS';
      error.statusCode = 409;
      throw error;
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        code,
        name: data.name.trim(),
        address: data.address?.trim() || null,
        rows: {
          create: [
            {
              code: 'R01',
              bins: {
                create: [
                  { code: 'S01', qrCode: `${code}-R01-S01`, zone: 'A', capacity: 100 },
                  { code: 'S02', qrCode: `${code}-R01-S02`, zone: 'A', capacity: 100 },
                  { code: 'S03', qrCode: `${code}-R01-S03`, zone: 'A', capacity: 100 },
                ],
              },
            },
            {
              code: 'R02',
              bins: {
                create: [
                  { code: 'S01', qrCode: `${code}-R02-S01`, zone: 'B', capacity: 100 },
                  { code: 'S02', qrCode: `${code}-R02-S02`, zone: 'B', capacity: 100 },
                ],
              },
            },
          ],
        },
      },
      include: {
        rows: {
          include: {
            bins: true,
          },
        },
      },
    });

    return warehouse;
  }

  static async getAllWarehouses() {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        rows: {
          include: {
            bins: {
              include: {
                inventories: true,
              },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return warehouses.map((wh) => {
      let totalBins = 0;
      let totalUnits = 0;

      for (const row of wh.rows) {
        totalBins += row.bins.length;
        for (const bin of row.bins) {
          for (const inv of bin.inventories) {
            totalUnits += inv.quantity;
          }
        }
      }

      return {
        id: wh.id,
        code: wh.code,
        name: wh.name,
        address: wh.address,
        totalRows: wh.rows.length,
        totalBins,
        totalUnits,
        createdAt: wh.createdAt,
        updatedAt: wh.updatedAt,
      };
    });
  }

  static async getWarehouseById(id: string) {
    const wh = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        rows: {
          include: {
            _count: {
              select: { bins: true },
            },
          },
          orderBy: { code: 'asc' },
        },
      },
    });

    if (!wh) {
      const error: any = new Error('Warehouse not found');
      error.code = 'WAREHOUSE_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    return {
      id: wh.id,
      code: wh.code,
      name: wh.name,
      address: wh.address,
      rows: wh.rows.map((r) => ({
        id: r.id,
        code: r.code,
        binsCount: r._count.bins,
      })),
      createdAt: wh.createdAt,
      updatedAt: wh.updatedAt,
    };
  }

  static async getWarehouseHierarchy(warehouseId: string) {
    const wh = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      include: {
        rows: {
          orderBy: { code: 'asc' },
          include: {
            bins: {
              orderBy: { code: 'asc' },
              include: {
                inventories: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!wh) {
      const error: any = new Error('Warehouse not found');
      error.code = 'WAREHOUSE_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    return {
      id: wh.id,
      code: wh.code,
      name: wh.name,
      address: wh.address,
      rows: wh.rows.map((row) => ({
        id: row.id,
        code: row.code,
        bins: row.bins.map((bin) => {
          const totalUnits = bin.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
          return {
            id: bin.id,
            code: bin.code,
            qrCode: bin.qrCode,
            zone: bin.zone,
            capacity: bin.capacity,
            totalUnits,
            occupancyRate: bin.capacity ? Math.min(100, Math.round((totalUnits / bin.capacity) * 100)) : 0,
            products: bin.inventories.map((inv) => ({
              inventoryId: inv.id,
              productId: inv.product.id,
              sku: inv.product.sku,
              name: inv.product.name,
              category: inv.product.category,
              quantity: inv.quantity,
            })),
          };
        }),
      })),
    };
  }

  static async getBinById(id: string) {
    const bin = await prisma.shelfBin.findUnique({
      where: { id },
      include: {
        row: {
          include: {
            warehouse: true,
          },
        },
        inventories: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!bin) {
      const error: any = new Error('Bin/Shelf not found');
      error.code = 'BIN_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const totalUnits = bin.inventories.reduce((sum, inv) => sum + inv.quantity, 0);

    return {
      id: bin.id,
      code: bin.code,
      qrCode: bin.qrCode,
      zone: bin.zone,
      capacity: bin.capacity,
      totalUnits,
      location: {
        warehouseId: bin.row.warehouse.id,
        warehouseCode: bin.row.warehouse.code,
        warehouseName: bin.row.warehouse.name,
        rowId: bin.row.id,
        rowCode: bin.row.code,
      },
      products: bin.inventories.map((inv) => ({
        inventoryId: inv.id,
        productId: inv.product.id,
        sku: inv.product.sku,
        name: inv.product.name,
        quantity: inv.quantity,
      })),
    };
  }

  static async getBinInventory(binId: string) {
    const bin = await prisma.shelfBin.findUnique({
      where: { id: binId },
      include: {
        inventories: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!bin) {
      const error: any = new Error('Bin not found');
      error.code = 'BIN_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    return bin.inventories.map((inv) => ({
      inventoryId: inv.id,
      productId: inv.product.id,
      sku: inv.product.sku,
      name: inv.product.name,
      category: inv.product.category,
      price: Number(inv.product.price),
      quantity: inv.quantity,
      updatedAt: inv.updatedAt,
    }));
  }
}
