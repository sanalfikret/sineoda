import { Route, type RouteProps } from 'react-router-dom'

interface LocaleRouteProps {
  tr: string
  en: string
  element: RouteProps['element']
  children?: RouteProps['children']
}

/** Registers the same page under TR and EN URL paths. */
export function LocaleRoute({ tr, en, element, children }: LocaleRouteProps) {
  return (
    <>
      <Route path={tr} element={element}>
        {children}
      </Route>
      <Route path={en} element={element}>
        {children}
      </Route>
    </>
  )
}
