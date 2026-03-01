-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "ccEmails" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "email" SET DEFAULT '';
