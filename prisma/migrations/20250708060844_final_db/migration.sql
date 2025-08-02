/*
  Warnings:

  - Added the required column `userId` to the `FileInformation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FileInformation" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "Oragnization_Name" SET DEFAULT 'Default';

-- AddForeignKey
ALTER TABLE "FileInformation" ADD CONSTRAINT "FileInformation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
