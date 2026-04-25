-- AlterTable
ALTER TABLE "banks" ADD COLUMN     "total_rake" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "rakes" (
    "id" UUID NOT NULL,
    "bank_id" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rakes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "rakes" ADD CONSTRAINT "rakes_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
