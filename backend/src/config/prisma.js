const { PrismaClient } = require("@prisma/client");

// Keep a single Prisma client instance for the entire app process.
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
