import { sql, eq, desc, gte, lte, and } from 'drizzle-orm';

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

  // Set end date to end of day
  endDate.setHours(23, 59, 59, 999);

  const startUnix = Math.floor(startDate.getTime() / 1000);
  const endUnix = Math.floor(endDate.getTime() / 1000);

  const dateFilter = and(
    sql`${tables.stockMovements.createdAt} >= ${startUnix}`,
    sql`${tables.stockMovements.createdAt} <= ${endUnix}`
  );

  const movementsByDay = (await db
    .select({
      date: sql<string>`date(${tables.stockMovements.createdAt}, 'unixepoch')`,
      type: tables.stockMovements.type,
      totalQuantity: sql<number>`SUM(ABS(${tables.stockMovements.quantity}))`,
    })
    .from(tables.stockMovements)
    .where(dateFilter)
    .groupBy(
      sql`date(${tables.stockMovements.createdAt}, 'unixepoch')`,
      tables.stockMovements.type
    )
    .orderBy(sql`date(${tables.stockMovements.createdAt}, 'unixepoch')`)) as { date: string; type: string; totalQuantity: number }[];

  const movementsChartData = processMovementsByDay(movementsByDay, startDate, endDate);

  const productsByCategory = await db
    .select({
      categoryId: tables.products.categoryId,
      categoryName: tables.categories.name,
      categoryColor: tables.categories.color,
      count: sql<number>`count(*)`,
    })
    .from(tables.products)
    .leftJoin(
      tables.categories,
      eq(tables.products.categoryId, tables.categories.id)
    )
    .where(eq(tables.products.isActive, true))
    .groupBy(
      tables.products.categoryId,
      tables.categories.name,
      tables.categories.color
    );

  const topProductsByValue = await db
    .select({
      id: tables.products.id,
      name: tables.products.name,
      stockValue: sql<number>`${tables.products.costPrice} * ${tables.products.stockQuantity}`,
    })
    .from(tables.products)
    .where(eq(tables.products.isActive, true))
    .orderBy(
      desc(sql`${tables.products.costPrice} * ${tables.products.stockQuantity}`)
    )
    .limit(10);

  const stockLevelsResult = await db
    .select({
      stockStatus: sql<string>`
        CASE 
          WHEN ${tables.products.stockQuantity} = 0 THEN 'out_of_stock'
          WHEN ${tables.products.stockQuantity} <= ${tables.products.stockMin} THEN 'low_stock'
          WHEN ${tables.products.stockMax} IS NOT NULL AND ${tables.products.stockQuantity} >= ${tables.products.stockMax} THEN 'overstock'
          ELSE 'normal'
        END
      `,
      count: sql<number>`count(*)`,
    })
    .from(tables.products)
    .where(eq(tables.products.isActive, true)).groupBy(sql`
      CASE 
        WHEN ${tables.products.stockQuantity} = 0 THEN 'out_of_stock'
        WHEN ${tables.products.stockQuantity} <= ${tables.products.stockMin} THEN 'low_stock'
        WHEN ${tables.products.stockMax} IS NOT NULL AND ${tables.products.stockQuantity} >= ${tables.products.stockMax} THEN 'overstock'
        ELSE 'normal'
      END
    `);

  const movementsByType = await db
    .select({
      type: tables.stockMovements.type,
      count: sql<number>`count(*)`,
      totalQuantity: sql<number>`SUM(ABS(${tables.stockMovements.quantity}))`,
    })
    .from(tables.stockMovements)
    .where(dateFilter)
    .groupBy(tables.stockMovements.type);

  return {
    movementsChart: movementsChartData,
    productsByCategory,
    topProductsByValue,
    stockLevels: stockLevelsResult,
    movementsByType,
    range: {
      start: startDateStr,
      end: endDateStr
    }
  };
});

function processMovementsByDay(
  movements: { date: string; type: string; totalQuantity: number }[],
  startDate: Date,
  endDate: Date
) {
  const dateMap = new Map<string, { in: number; out: number }>();
  const dates: string[] = [];

  const current = new Date(startDate);
  // Ensure we compare without time for date inclusion
  const targetEnd = new Date(endDate);
  targetEnd.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    dates.push(dateStr);
    dateMap.set(dateStr, { in: 0, out: 0 });
    current.setDate(current.getDate() + 1);
  }

  for (const m of movements) {
    if (dateMap.has(m.date)) {
      const existing = dateMap.get(m.date)!;
      if (m.type === 'in') {
        existing.in = m.totalQuantity;
      } else if (m.type === 'out') {
        existing.out = m.totalQuantity;
      }
    }
  }

  const isWideRange = dates.length > 31;
  const labels = dates.map((d) => {
    const date = new Date(d);
    if (isWideRange) {
      // Show month if range is wide
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: dates.length > 365 ? '2-digit' : undefined });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const stockIn = dates.map((d) => dateMap.get(d)?.in || 0);
  const stockOut = dates.map((d) => dateMap.get(d)?.out || 0);

  return { labels, stockIn, stockOut };
}
