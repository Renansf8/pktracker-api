-- CreateEnum
CREATE TYPE "TournamentType" AS ENUM ('BOUNTY', 'VANILLA');

-- CreateEnum
CREATE TYPE "TournamentSpeed" AS ENUM ('REGULAR', 'TURBO', 'HYPER');

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "type" "TournamentType",
ADD COLUMN     "speed" "TournamentSpeed";
