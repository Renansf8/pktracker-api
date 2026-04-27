-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('WEEKLY', 'SUNDAY');

-- AlterTable
ALTER TABLE "tournament_schedule_items" ADD COLUMN     "type" "ScheduleType" NOT NULL DEFAULT 'WEEKLY';
