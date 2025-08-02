/*
  Warnings:

  - You are about to drop the column `Oragnization_Name` on the `Organization` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[Organization_Name]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Organization_Oragnization_Name_key";

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "Oragnization_Name",
ADD COLUMN     "Organization_Name" TEXT NOT NULL DEFAULT 'Test-Org';

-- CreateIndex
CREATE UNIQUE INDEX "Organization_Organization_Name_key" ON "Organization"("Organization_Name");
