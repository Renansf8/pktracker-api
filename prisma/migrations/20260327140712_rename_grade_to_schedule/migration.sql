-- RenameTable
ALTER TABLE "tournament_grade_items" RENAME TO "tournament_schedule_items";

-- RenameConstraints
ALTER TABLE "tournament_schedule_items" RENAME CONSTRAINT "tournament_grade_items_pkey" TO "tournament_schedule_items_pkey";
ALTER TABLE "tournament_schedule_items" RENAME CONSTRAINT "tournament_grade_items_user_id_fkey" TO "tournament_schedule_items_user_id_fkey";
