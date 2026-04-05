import { db } from "@/lib/db";
import { characterRelations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; relationId: string }> }
) {
  const { relationId } = await params;
  await db
    .delete(characterRelations)
    .where(eq(characterRelations.id, relationId));
  return NextResponse.json({ ok: true });
}
