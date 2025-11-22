/*
  Warnings:

  - A unique constraint covering the columns `[trackingCode]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `trackUrl` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trackingCode` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "statusHistory" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "trackUrl" TEXT NOT NULL,
ADD COLUMN     "trackingCode" TEXT NOT NULL,
ALTER COLUMN "smsHistory" SET DEFAULT '[]';

-- CreateIndex
CREATE UNIQUE INDEX "Order_trackingCode_key" ON "Order"("trackingCode");
