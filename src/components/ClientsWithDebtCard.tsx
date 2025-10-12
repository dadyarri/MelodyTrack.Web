import {Box, Card, CardContent, Typography} from "@mui/material";
import {useEffect, useState} from "react";
import {clientService} from "../services/client.ts";
import {Client} from "../types/client.ts";

const ClientsWithDebtCard = () => {
    const [data, setData] = useState<Client[]>([]);

    useEffect(() => {
        clientService.getClientsWithDebt()
            .then((res) => setData(res))
    }, []);

    return (<Card sx={{height: '100%'}}>
        <CardContent>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                }}
            >
                <Typography variant="h6">Должники</Typography>
            </Box>
        </CardContent>
    </Card>)
}

export default ClientsWithDebtCard