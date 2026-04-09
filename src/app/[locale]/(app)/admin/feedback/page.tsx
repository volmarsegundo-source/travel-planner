import { getFeedbackListAction } from "@/server/actions/feedback.actions";
import { AdminFeedbackClient } from "./AdminFeedbackClient";

export default async function AdminFeedbackPage() {
  const result = await getFeedbackListAction({ page: 1 });

  const initialData =
    result.success && result.data
      ? result.data
      : { items: [], total: 0, pageCount: 0 };

  return <AdminFeedbackClient initialData={initialData} />;
}
