CREATE TABLE "AssetThumbnail" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssetThumbnail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetThumbnail_assetId_key" ON "AssetThumbnail"("assetId");

ALTER TABLE "AssetThumbnail"
ADD CONSTRAINT "AssetThumbnail_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
