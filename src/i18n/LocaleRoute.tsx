import { Route, type RouteProps } from 'react-router-dom'

export interface LocaleRouteProps {
  tr: string
  en: string
  element: RouteProps['element']
  children?: RouteProps['children']
}

/**
 * Registers TR + EN paths as direct `<Route>` children for `<Routes>`.
 * Use as `{localeRoutes({ tr, en, element })}` — custom wrapper components are ignored by Routes.
 */
export function localeRoutes({ tr, en, element, children }: LocaleRouteProps) {
  return [
    <Route key={tr} path={tr} element={element}>
      {children}
    </Route>,
    <Route key={en} path={en} element={element}>
      {children}
    </Route>,
  ]
}
