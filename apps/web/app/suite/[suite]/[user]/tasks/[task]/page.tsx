import { notFound } from "next/navigation";
import { getSuite, getTask, runsFor } from "@/lib/data";
import { TaskWorkbench } from "@/components/suite/TaskWorkbench";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ suite: string; user: string; task: string }>;
}) {
  const { suite: suiteSlug, task: taskSlug, user } = await params;
  const suite = getSuite(suiteSlug);
  const task = getTask(suiteSlug, taskSlug);
  if (!suite || !task) notFound();

  return (
    <TaskWorkbench
      task={task}
      seeded={runsFor(suiteSlug, taskSlug)}
      user={user}
    />
  );
}
