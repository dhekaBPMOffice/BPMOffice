import { getFrameworks } from "./actions";
import { FrameworkContent } from "./framework-content";

export default async function FrameworkPage() {
  const { frameworks, activeIds, error } = await getFrameworks();

  return (
    <FrameworkContent
      frameworks={frameworks}
      activeIds={activeIds}
      initialError={error}
    />
  );
}
