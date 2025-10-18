import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {router} from './router';
import {RouterProvider} from "@tanstack/react-router";
import {TanStackRouterDevtools} from "@tanstack/react-router-devtools";

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RouterProvider router={router}/>
        {process.env.NODE_ENV === "development" && (
            <TanStackRouterDevtools router={router} initialIsOpen={false}/>
        )}
    </StrictMode>,
)
