import { createFileRoute } from '@tanstack/react-router'
import {Typography} from "@mui/material";

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Typography>Route</Typography>
}
