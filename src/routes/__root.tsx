import * as React from 'react'
import * as Router from '@tanstack/react-router'
import type {RouterContext} from "../types/tanstack-router";

export const Route = Router.createRootRouteWithContext<RouterContext>()({
    component: RootComponent,
})

function RootComponent() {
    return (
        <React.Fragment>
            <Router.Outlet/>
        </React.Fragment>
    )
}
