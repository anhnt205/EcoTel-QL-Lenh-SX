import {  Suspense } from 'react';
import { Route, Outlet } from 'react-router-dom';
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background/50 backdrop-blur-xs">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
  </div>
);

export const reportsRoutes = (
  <Route
    element={
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    }
  >
  </Route>
);

