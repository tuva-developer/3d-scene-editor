-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('MODEL', 'IMAGE', 'OTHER');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "kind" "AssetKind" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "Asset_ownerId_kind_idx" ON "Asset"("ownerId", "kind");
