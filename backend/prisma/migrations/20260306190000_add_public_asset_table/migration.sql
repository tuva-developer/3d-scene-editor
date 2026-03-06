-- CreateTable
CREATE TABLE "PublicAsset" (
    "id" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL DEFAULT 'OTHER',
    "name" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "path" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicAsset_path_key" ON "PublicAsset"("path");

-- CreateIndex
CREATE INDEX "PublicAsset_kind_isActive_idx" ON "PublicAsset"("kind", "isActive");
