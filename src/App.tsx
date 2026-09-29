import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/shared/components/AppShell'
import { HomePage } from '@/features/events/pages/HomePage'
import { EventPage } from '@/features/events/pages/EventPage'
import { RoundPage } from '@/features/round/pages/RoundPage'
import { ROUTES } from '@/core/constants/routes'

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: ROUTES.HOME, element: <HomePage /> },
      { path: ROUTES.EVENT, element: <EventPage /> },
      { path: ROUTES.ROUND, element: <RoundPage /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
