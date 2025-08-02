/*
  Warnings:

  - A unique constraint covering the columns `[Oragnization_Name]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "Oragnization_Name" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_Oragnization_Name_key" ON "Organization"("Oragnization_Name");
