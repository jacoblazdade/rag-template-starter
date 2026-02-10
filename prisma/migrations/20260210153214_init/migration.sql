-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "blobName" TEXT NOT NULL,
    "parseMethod" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "chunkCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "pageNumber" INTEGER,

    CONSTRAINT "chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chunks_documentId_idx" ON "chunks"("documentId");

-- AddForeignKey
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
