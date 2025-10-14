import {Box, Typography, Paper} from '@mui/material'
import ExpensesCard from '../components/ExpensesCard'
import TimeCard from "../components/TimeCard.tsx";
import MiniScheduleCard from "../components/MiniScheduleCard.tsx";
import ClientsWithDebtCard from "../components/ClientsWithDebtCard.tsx";
import {Masonry} from "@mui/lab";

const Home = () => {
    return (
        <Box>
            <Typography variant="h2" component="h1" gutterBottom>
                Добро пожаловать в MelodyTrack
            </Typography>

            <Masonry columns={{xs: 1, md: 3, lg: 4}} spacing={3}>
                <Paper key={1}>
                    <MiniScheduleCard/>
                </Paper>
                <Paper key={2}>
                    <TimeCard/>
                </Paper>
                <Paper key={3}>
                    <ClientsWithDebtCard/>
                </Paper>
                <Paper key={4}>
                    <ExpensesCard/>
                </Paper>
            </Masonry>
        </Box>
    )
}

export default Home 