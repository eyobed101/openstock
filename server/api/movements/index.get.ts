import { desc, count, and, eq, sql } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();

  // Get query parameters
  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 20;
  const offset = (page - 1) * limit;

  // Filter parameters
  const typeFilter = query.type as string;
  const productIdFilter = query.productId as string;
  const startDate = query.startDate as string;
  const endDate = query.endDate as string;

  // Build where conditions
  const conditions = [];

  if (typeFilter) {
    conditions.push(sql`${tables.stockMovements.type} = ${typeFilter}`);
  }

  if (productIdFilter) {
    conditions.push(eq(tables.stockMovements.productId, productIdFilter));
  }

  if (startDate) {
    // Convert to Unix timestamp (seconds)
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    conditions.push(sql`${tables.stockMovements.createdAt} >= ${startTimestamp}`);
  }

  if (endDate) {
    // Convert to Unix timestamp (seconds) and add 1 day to include the entire end date
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000) + 86400;
    conditions.push(sql`${tables.stockMovements.createdAt} <= ${endTimestamp}`);
  }

  // Get total count with filters
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(tables.stockMovements)
    .where(whereClause);

  // Get paginated movements with filters
  const movements = await db.query.stockMovements.findMany({
    where: whereClause,
    orderBy: [desc(tables.stockMovements.createdAt)],
    with: {
      product: true,
      supplier: true,
    },
    limit,
    offset,
  });

  return {
    data: movements,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
});
