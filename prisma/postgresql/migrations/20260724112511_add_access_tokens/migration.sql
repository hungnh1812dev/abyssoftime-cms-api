-- CreateTable
CREATE TABLE "access_tokens" (
    "id" SERIAL NOT NULL,
    "document_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "access_tokens_pkey" PRIMARY KEY ("document_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "access_tokens_document_id_key" ON "access_tokens"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "access_tokens_token_key" ON "access_tokens"("token");

-- AddForeignKey
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("document_id") ON DELETE SET NULL ON UPDATE CASCADE;
