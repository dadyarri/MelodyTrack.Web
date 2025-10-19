import {createFileRoute} from '@tanstack/react-router'
import {protectRoute} from "../../util/protectRoute";

export const Route = createFileRoute('/app/')({
    beforeLoad: ({context, location}) => {
        protectRoute(context, location);
    },
    component: RouteComponent,
})

function RouteComponent() {
    return <div>Hello "/app/"!</div>
}
