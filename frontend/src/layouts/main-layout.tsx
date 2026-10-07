import { Header } from './header';
import { TabBar } from './tab-bar';
import { KeepAliveOutlet } from './keep-alive-outlet';
import { isEmbedded } from '@/lib/embed';

// Quyết định 1 lần lúc tải trang: khung nhúng không đổi giữa chừng.
const EMBEDDED = isEmbedded();

export function MainLayout() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Nhúng trong Điều phối: menu do Điều phối vẽ nên ẩn header + thanh tab. */}
      {!EMBEDDED && <Header />}
      {!EMBEDDED && <TabBar />}
      {/* KeepAliveOutlet thay cho <Outlet/>: giữ trang đã vào còn sống thay vì
          huỷ, để chuyển qua lại không mất việc đang làm dở — xem file đó. */}
      <main className="flex-1 min-h-0 overflow-y-auto bg-background">
        <KeepAliveOutlet />
      </main>
    </div>
  );
}
