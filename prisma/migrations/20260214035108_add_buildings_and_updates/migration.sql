/*
  Warnings:

  - You are about to drop the column `buildingName` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `senderAddress` on the `Settings` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL DEFAULT '',
    "tenantId" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT 'Amount Charged towards rental of the premises',
    "baseRent" REAL NOT NULL,
    "cgstRate" REAL NOT NULL DEFAULT 9.0,
    "sgstRate" REAL NOT NULL DEFAULT 9.0,
    "cgstAmount" REAL NOT NULL,
    "sgstAmount" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentAt" DATETIME,
    "pdfPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Sender" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("baseRent", "cgstAmount", "cgstRate", "createdAt", "description", "id", "invoiceDate", "invoiceNumber", "month", "pdfPath", "senderId", "sentAt", "sgstAmount", "sgstRate", "status", "tenantId", "totalAmount", "updatedAt", "year") SELECT "baseRent", "cgstAmount", "cgstRate", "createdAt", "description", "id", "invoiceDate", "invoiceNumber", "month", "pdfPath", "senderId", "sentAt", "sgstAmount", "sgstRate", "status", "tenantId", "totalAmount", "updatedAt", "year" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE TABLE "new_Sender" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "gstNumber" TEXT NOT NULL DEFAULT '',
    "nextInvoiceNum" INTEGER NOT NULL DEFAULT 1,
    "signature" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Sender" ("createdAt", "gstNumber", "id", "isActive", "name", "nextInvoiceNum", "updatedAt") SELECT "createdAt", "gstNumber", "id", "isActive", "name", "nextInvoiceNum", "updatedAt" FROM "Sender";
DROP TABLE "Sender";
ALTER TABLE "new_Sender" RENAME TO "Sender";
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "senderPhone" TEXT NOT NULL DEFAULT '',
    "senderEmail" TEXT NOT NULL DEFAULT '',
    "smtpHost" TEXT NOT NULL DEFAULT 'smtp.gmail.com',
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpUser" TEXT NOT NULL DEFAULT '',
    "smtpPass" TEXT NOT NULL DEFAULT '',
    "paymentTerms" TEXT NOT NULL DEFAULT 'Payment due within 15 days of invoice date.',
    "bankDetails" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("bankDetails", "createdAt", "id", "paymentTerms", "senderEmail", "senderPhone", "smtpHost", "smtpPass", "smtpPort", "smtpUser", "updatedAt") SELECT "bankDetails", "createdAt", "id", "paymentTerms", "senderEmail", "senderPhone", "smtpHost", "smtpPass", "smtpPort", "smtpUser", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
