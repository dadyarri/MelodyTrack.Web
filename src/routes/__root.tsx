import * as React from 'react'
import * as Router from '@tanstack/react-router'

export const Route = Router.createRootRoute({
    component: RootComponent,
})

function RootComponent() {
    return (
        <React.Fragment>
            <Router.Outlet/>
        </React.Fragment>
    )
}
