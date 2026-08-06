import { Outlet } from 'react-router-dom';
import { Header } from './header';

export function MainLayout() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 overflow-y-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}
