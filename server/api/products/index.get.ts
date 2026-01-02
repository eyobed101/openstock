import { desc, count, and, or, sql, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const query = getQuery(event);

  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const search = query.search as string;
  const categoryId = query.categoryId as string;
  const isActive = query.isActive !== 'false'; // Default to true

  const conditions = [];

  if (isActive !== undefined) {
    conditions.push(eq(tables.products.isActive, isActive));
  }

  if (categoryId) {
    conditions.push(eq(tables.products.categoryId, categoryId));
  }

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        sql`${tables.products.name} LIKE ${searchPattern}`,
        sql`${tables.products.sku} LIKE ${searchPattern}`
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(tables.products)
    .where(whereClause);

  // Get paginated products
  const products = await db.query.products.findMany({
    where: whereClause,
    orderBy: [desc(tables.products.createdAt)],
    with: {
      category: true,
      supplier: true,
      tax: true,
      variants: {
        with: {
          supplier: true,
          tax: true,
        },
      },
    },
    limit,
    offset,
  });

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
});
