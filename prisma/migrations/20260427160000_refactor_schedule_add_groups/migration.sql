-- Clear existing schedule items (user confirmed data can be dropped)
TRUNCATE TABLE "tournament_schedule_items";

-- CreateTable
CREATE TABLE "tournament_schedules" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ScheduleType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_schedules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tournament_schedules" ADD CONSTRAINT "tournament_schedules_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: drop type, add schedule_id
ALTER TABLE "tournament_schedule_items" DROP COLUMN "type";
ALTER TABLE "tournament_schedule_items" ADD COLUMN "schedule_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "tournament_schedule_items" ADD CONSTRAINT "tournament_schedule_items_schedule_id_fkey"
    FOREIGN KEY ("schedule_id") REFERENCES "tournament_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
