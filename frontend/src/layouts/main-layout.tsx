import { Header } from './header';
import { TabBar } from './tab-bar';
import { KeepAliveOutlet } from './keep-alive-outlet';

export function MainLayout() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <Header />
      <TabBar />
      {/* KeepAliveOutlet thay cho <Outlet/>: giữ trang đã vào còn sống thay vì
          huỷ, để chuyển qua lại không mất việc đang làm dở — xem file đó. */}
      <main className="flex-1 min-h-0 overflow-y-auto bg-background">
        <KeepAliveOutlet />
      </main>
    </div>
  );
}
