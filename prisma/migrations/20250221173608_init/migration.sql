-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "picture" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileInformation" (
    "file_id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "file_Name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parseMode" TEXT NOT NULL,
    "parsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "markDown" TEXT,
    "text" TEXT,
    "json" TEXT,
    "images" TEXT,
    "layout" TEXT,
    "xlsx" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "FileInformation_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "Organization_Id" TEXT NOT NULL,
    "Oragnization_Name" TEXT NOT NULL DEFAULT 'Default',
    "userId" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("Organization_Id")
);

-- CreateTable
CREATE TABLE "Project" (
    "Porject_Name" TEXT NOT NULL,
    "Project_Id" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Organization_Id" TEXT NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("Project_Id")
);

-- CreateTable
CREATE TABLE "Sign_Up_For_WaitList" (
    "Full_Name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "Text_Document_And_Pdf" BOOLEAN NOT NULL,
    "Csvs_And_Excel" BOOLEAN NOT NULL,
    "Images" BOOLEAN NOT NULL,
    "Others" TEXT NOT NULL,
    "Company_Size" INTEGER NOT NULL,
    "Title" TEXT NOT NULL,
    "LinkedIn_Url" TEXT NOT NULL,
    "Saas" BOOLEAN NOT NULL,
    "Onprimise_Deployment" BOOLEAN NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FileInformation_uuid_key" ON "FileInformation"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Sign_Up_For_WaitList_email_key" ON "Sign_Up_For_WaitList"("email");

-- AddForeignKey
ALTER TABLE "FileInformation" ADD CONSTRAINT "FileInformation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("Organization_Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_Organization_Id_fkey" FOREIGN KEY ("Organization_Id") REFERENCES "Organization"("Organization_Id") ON DELETE RESTRICT ON UPDATE CASCADE;
