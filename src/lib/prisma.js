import { PrismaClient } from '@prisma/client'

const dbUrl = process.env.DATABASE_URL || "mysql://root:root@localhost:3306/marcon_almoxarifado"

const globalForPrisma = globalThis

export const prisma =
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl
      }
    }
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

