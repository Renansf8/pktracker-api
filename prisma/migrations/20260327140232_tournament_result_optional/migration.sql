-- AlterTable
ALTER TABLE "tournaments" ALTER COLUMN "result" DROP NOT NULL,
ALTER COLUMN "profit" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "tournament_grade_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "buyIn" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_grade_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tournament_grade_items" ADD CONSTRAINT "tournament_grade_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
