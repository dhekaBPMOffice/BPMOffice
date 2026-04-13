import { NextResponse } from "next/server";
import { getStrategicAlignmentData } from "@/app/escritorio/estrategia/alinhamento-estrategico/actions";

export async function GET() {
  const { objectives, links, processes, error } = await getStrategicAlignmentData();

  return NextResponse.json(
    {
      objectives,
      links,
      processes,
      error,
    },
    { status: 200 }
  );
}

