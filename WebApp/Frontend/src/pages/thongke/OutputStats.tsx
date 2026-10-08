import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Tab, Tabs } from "@mui/material";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import ThongKeFrame from "../../components/thongke/ThongKeFrame";
import { canSeeTkModule, TK_OUTPUT_TABS } from "../../layout/thongkeMenu";

// "Thống kê sản lượng": trang 2 tab nhúng 2 màn của phần mềm Thống kê —
//   Tab "Sản lượng thống kê" (báo cáo thống kê: bảng tính sản lượng theo kỳ)
//   Tab "Báo chuyến"
// Mỗi tab là 1 khung nhúng riêng, chỉ tạo khi mở lần đầu và GIỮ SỐNG sau đó để chuyển qua lại không mất việc đang
// xem. Tab hiện theo quyền Xem của module tương ứng (tk-stat-report, tk-trip-report). Tab mở sẵn lấy từ `?tab=`.
const OutputStats = () => {
  const [user] = useAtom(userAtom);
  const [params, setParams] = useSearchParams();

  const visible = TK_OUTPUT_TABS.filter((t) => canSeeTkModule(user, t.module));
  const wanted = params.get("tab");
  const active = visible.find((t) => t.key === wanted)?.key ?? visible[0]?.key;

  // chỉ gắn khung của tab đã từng được mở
  const [opened, setOpened] = useState<string[]>(active ? [active] : []);
  useEffect(() => {
    if (active && !opened.includes(active)) setOpened((prev) => [...prev, active]);
  }, [active, opened]);

  if (visible.length === 0) return null;

  return (
    <Box>
      <Tabs
        value={active}
        onChange={(_, key) => setParams(key === visible[0].key ? {} : { tab: key }, { replace: true })}
        sx={{ borderBottom: "1px solid #e5e9f0" }}
      >
        {visible.map((t) => (
          <Tab
            key={t.key}
            value={t.key}
            label={t.label}
            sx={{ textTransform: "none", fontWeight: 600 }}
          />
        ))}
      </Tabs>
      {visible.map((t) =>
        opened.includes(t.key) ? (
          // MainLayout bọc nội dung trong padding 24px; khung chiếm hết bề ngang và phần còn lại của màn hình
          <Box key={t.key} sx={{ display: active === t.key ? "block" : "none", mx: -3, mb: -3 }}>
            <ThongKeFrame path={t.to} />
          </Box>
        ) : null,
      )}
    </Box>
  );
};

export default OutputStats;
