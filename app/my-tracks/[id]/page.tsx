import CustomTrackLoader from "@/components/CustomTrackLoader";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomTrackPage({ params }: PageProps) {
  const { id } = await params;
  return <CustomTrackLoader id={id} />;
}
