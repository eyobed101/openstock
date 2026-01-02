import { desc, count } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();

  // Get query parameters
  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 20;
  const offset = (page - 1) * limit;

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(tables.stockMovements);

  // Get paginated movements
  const movements = await db.query.stockMovements.findMany({
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
