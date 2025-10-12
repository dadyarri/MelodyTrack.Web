import {Box, Card, CardContent, Typography} from "@mui/material";
import {useEffect, useState} from "react";
import {format} from "date-fns";

const TimeCard = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timerId);
    }, []);
    return (<Card>
        <CardContent>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                }}
            >
                <Typography variant="h6">Время</Typography>
                <Typography variant="h4">
                    {format(currentTime, 'HH:mm:ss')}
                </Typography>
            </Box>
        </CardContent>
    </Card>)
}

export default TimeCard;