import { lazy, Suspense } from 'react';
import { Route, Outlet } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

const SignInPage = lazy(() =>
  import('@/modules/auth/pages/sign-in-page').then((m) => ({ default: m.SignInPage }))
);
const ForbiddenPage = lazy(() =>
  import('@/modules/auth/pages/forbidden-page').then((m) => ({ default: m.ForbiddenPage }))
);

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background/50 backdrop-blur-xs">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
  </div>
);

export const authRoutes = (
  <Route
    element={
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    }
  >
    <Route path={ROUTES.AUTH.LOGIN} element={<SignInPage />} />
    <Route path={ROUTES.FORBIDDEN} element={<ForbiddenPage />} />
  </Route>
);

