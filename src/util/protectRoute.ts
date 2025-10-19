import type {RouterContext} from "../types/tanstack-router";
import {type ParsedLocation, redirect} from "@tanstack/react-router";

export function protectRoute(context: RouterContext, location: ParsedLocation) {
    if (!context.auth?.isAuthenticated) {
        throw redirect({
            to: '/login',
            search: {
                redirect: location.href
            }
        })
    }
}