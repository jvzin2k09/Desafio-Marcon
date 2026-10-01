import { PrismaClient } from '@prisma/client'

const dbUrl = process.env.DATABASE_URL || "mysql://root:root@localhost:3306/marcon_almoxarifado"

const globalForPrisma = globalThis

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: dbUrl
      }
    }
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

