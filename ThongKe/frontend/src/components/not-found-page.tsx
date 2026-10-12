import { useNavigate } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-105 rounded-[24px] border-hairline bg-paper p-8 text-center shadow-subtle">
        <CardContent className="p-0">
          <FileQuestion className="mx-auto mb-6 h-16 w-16 text-mid-gray" />
          <h1 className="mb-2 text-heading-lg font-semibold tracking-heading-lg text-ink">
            404
          </h1>
          <p className="mb-2 text-subheading font-medium text-ink">
            Không tìm thấy trang
          </p>
          <p className="mb-8 text-body text-mid-gray">
            Trang bạn tìm kiếm không tồn tại hoặc đã bị di chuyển.
          </p>
          <Button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="rounded-[18px] bg-ink px-6 py-2 text-body font-medium text-paper hover:bg-ink-soft"
          >
            Quay về trang chủ
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
