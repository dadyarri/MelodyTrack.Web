import * as React from 'react'
import * as Router from '@tanstack/react-router'
import type {RouterContext} from "../types/tanstack-router";
import {Box, Container} from "@mui/material";

export const Route = Router.createRootRouteWithContext<RouterContext>()({
    component: RootComponent,
})

function RootComponent() {
    return (
        <React.Fragment>
            <Box sx={{height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
                <Container maxWidth="xl" sx={{py: 4, flex: 1}}>
                    <Router.Outlet/>
                </Container>
            </Box>
        </React.Fragment>
    )
}
