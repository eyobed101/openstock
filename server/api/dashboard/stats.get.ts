import { eq, sql, lte, desc, and, gte } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const query = getQuery(event);

  // Default to last 30 days if no dates provided
  const now = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(now.getDate() - 30);

  const startDateStr = (query.startDate as string) || defaultStart.toISOString().split('T')[0];
  const endDateStr = (query.endDate as string) || now.toISOString().split('T')[0];

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  endDate.setHours(23, 59, 59, 999);

  const startUnix = Math.floor(startDate.getTime() / 1000);
  const endUnix = Math.floor(endDate.getTime() / 1000);

  const dateFilter = and(
    sql`${tables.stockMovements.createdAt} >= ${startUnix}`,
    sql`${tables.stockMovements.createdAt} <= ${endUnix}`
  );

  const totalProductsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(tables.products)
    .where(eq(tables.products.isActive, true));
  const totalProducts = totalProductsResult[0]?.count ?? 0;

  const totalSuppliersResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(tables.suppliers)
    .where(eq(tables.suppliers.isActive, true));
  const totalSuppliers = totalSuppliersResult[0]?.count ?? 0;

  const lowStockProducts = await db
    .select()
    .from(tables.products)
    .where(
      sql`${tables.products.stockQuantity} <= ${tables.products.stockMin} AND ${tables.products.isActive} = 1`
    )
    .limit(5);
  const lowStockCount = lowStockProducts.length;

  const stockValueResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${tables.products.costPrice} * ${tables.products.stockQuantity}), 0)`,
    })
    .from(tables.products)
    .where(eq(tables.products.isActive, true));
  const totalStockValue =
    Math.round((stockValueResult[0]?.total ?? 0) * 100) / 100;

  const recentMovements = await db.query.stockMovements.findMany({
    where: dateFilter,
    limit: 5,
    orderBy: [desc(tables.stockMovements.createdAt)],
    with: {
      product: true,
    },
  });

  return {
    totalProducts,
    totalSuppliers,
    lowStockCount,
    totalStockValue,
    lowStockProducts,
    recentMovements,
    range: {
      start: startDateStr,
      end: endDateStr
    }
  };
});
