import { useNavigate } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-105 rounded-[24px] border-hairline bg-paper p-8 text-center shadow-subtle">
        <CardContent className="p-0">
          <ShieldX className="mx-auto mb-6 h-16 w-16 text-mid-gray" />
          <h1 className="mb-2 text-heading-lg font-semibold tracking-heading-lg text-ink">
            403
          </h1>
          <p className="mb-2 text-subheading font-medium text-ink">
            Không có quyền truy cập
          </p>
          <p className="mb-8 text-body text-mid-gray">
            Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị
            viên.
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
