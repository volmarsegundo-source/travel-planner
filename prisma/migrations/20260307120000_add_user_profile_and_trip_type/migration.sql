-- AlterTable
ALTER TABLE "trips" ADD COLUMN "tripType" VARCHAR(20) NOT NULL DEFAULT 'international';

-- CreateTable
CREATE TABLE "user_profiles" (
    "userId" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "phone" VARCHAR(20),
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "address" VARCHAR(300),
    "passportNumberEnc" TEXT,
    "passportExpiry" TIMESTAMP(3),
    "nationalIdEnc" TEXT,
    "bio" VARCHAR(500),
    "dietaryRestrictions" VARCHAR(300),
    "accessibility" VARCHAR(300),
    "completionScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
