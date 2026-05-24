import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.idempotencyKey.deleteMany();

  // Warehouses
  const wh1 = await prisma.warehouse.create({
    data: { name: "Mumbai Central", location: "Mumbai, Maharashtra" },
  });
  const wh2 = await prisma.warehouse.create({
    data: { name: "Delhi North Hub", location: "Delhi, NCR" },
  });
  const wh3 = await prisma.warehouse.create({
    data: { name: "Bengaluru Tech Park", location: "Bengaluru, Karnataka" },
  });

  // Products
  const products = [
    {
      name: "Wireless Noise-Cancelling Headphones",
      description: "Premium over-ear headphones with 30hr battery life and active noise cancellation.",
      imageUrl: "/images/products/headphones.svg",
      price: "12999.00",
      sku: "WNC-HP-001",
    },
    {
      name: "Mechanical Keyboard TKL",
      description: "Tenkeyless mechanical keyboard with Cherry MX Blue switches and RGB backlighting.",
      imageUrl: "/images/products/keyboard.svg",
      price: "8499.00",
      sku: "MKB-TKL-002",
    },
    {
      name: "USB-C Hub 7-in-1",
      description: "Aluminium USB-C hub with HDMI 4K, 3×USB-A, SD card, and 100W PD passthrough.",
      imageUrl: "/images/products/usb-c-hub.svg",
      price: "3299.00",
      sku: "USB-HUB-003",
    },
    {
      name: "Ergonomic Office Chair",
      description: "Lumbar-support mesh chair with adjustable armrests and breathable back.",
      imageUrl: "/images/products/office-chair.svg",
      price: "24999.00",
      sku: "ERG-CHR-004",
    },
    {
      name: "27\" 4K IPS Monitor",
      description: "Wide-gamut IPS panel with 144Hz refresh rate and factory colour calibration.",
      imageUrl: "/images/products/monitor.svg",
      price: "42999.00",
      sku: "MON-4K-005",
    },
    {
      name: "Compact Webcam 1080p",
      description: "Full HD webcam with built-in mic, auto-focus, and privacy shutter.",
      imageUrl: "/images/products/webcam.svg",
      price: "4599.00",
      sku: "CAM-HD-006",
    },
  ];

  const stockMatrix: Record<string, [number, number, number]> = {
    "WNC-HP-001": [15, 8, 3],
    "MKB-TKL-002": [20, 5, 12],
    "USB-HUB-003": [50, 30, 25],
    "ERG-CHR-004": [6, 2, 1],
    "MON-4K-005": [10, 0, 4],
    "CAM-HD-006": [35, 20, 18],
  };

  for (const p of products) {
    const product = await prisma.product.create({ data: p });
    const [q1, q2, q3] = stockMatrix[p.sku];
    await prisma.stock.createMany({
      data: [
        { productId: product.id, warehouseId: wh1.id, total: q1, reserved: 0 },
        { productId: product.id, warehouseId: wh2.id, total: q2, reserved: 0 },
        { productId: product.id, warehouseId: wh3.id, total: q3, reserved: 0 },
      ],
    });
  }

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
