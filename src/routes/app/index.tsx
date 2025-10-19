import {createFileRoute, redirect} from '@tanstack/react-router'

export const Route = createFileRoute('/app/')({
    beforeLoad: ({context, location}) => {
        if (!context.auth?.isAuthenticated) {
            throw redirect({
                to: '/login',
                search: {
                    redirect: location.href
                }
            })
        }
    },
    component: RouteComponent,
})

function RouteComponent() {
    return <div>Hello "/app/"!</div>
}
