import "@tanstack/react-router"; // Import this to augment the module

// Import your router instance to ensure its type is available
import { router } from "router"; // Adjust path if your router.ts is elsewhere

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router; // Register your router instance
    }
}