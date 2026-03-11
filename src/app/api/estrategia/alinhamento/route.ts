import { NextResponse } from "next/server";
import { getStrategicAlignmentData } from "@/app/escritorio/estrategia/alinhamento-estrategico/actions";

export async function GET() {
  const { objectives, links, error } = await getStrategicAlignmentData();

  return NextResponse.json(
    {
      objectives,
      links,
      error,
    },
    {
      status: error ? 400 : 200,
    }
  );
}

