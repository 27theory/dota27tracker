import { NextResponse } from "next/server";
import { requestJson, DataError, clearCache } from "@/lib/dota-api";
import { apiError, guardMutation } from "@/lib/http";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    guardMutation(req, "parse", 3);
    const { id } = await params;
    if (!/^\d{1,12}$/.test(id) || BigInt(id) === 0n)
      throw new DataError("Для парсинга нужен реальный Match ID", 400);
    await requestJson(`https://api.opendota.com/api/request/${id}`, {
      method: "POST",
    });
    await clearCache(`match:${id}`);
    return NextResponse.json({
      message:
        "Матч поставлен в очередь OpenDota. Обновите данные через 1–2 минуты.",
    });
  } catch (e) {
    return apiError(e);
  }
}
