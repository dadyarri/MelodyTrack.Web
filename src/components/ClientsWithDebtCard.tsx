import {
    Alert,
    Box,
    Card,
    CardContent,
    CircularProgress,
    IconButton,
    List,
    ListItem, ListItemText,
    Tooltip,
    Typography
} from "@mui/material";
import {useEffect, useState} from "react";
import {clientService} from "../services/client.ts";
import {Client} from "../types/client.ts";
import RefreshIcon from "@mui/icons-material/Refresh";

const ClientsWithDebtCard = () => {
    const [data, setData] = useState<Client[]>();
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string>('')
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        fetchData()
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true)
            setError('')
            const res = await clientService.getClientsWithDebt()
            setData(res)
        } catch (err) {
            setError('Ошибка при загрузке клиентов')
            console.log(`Error fetching clients: ${err}`)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const handleRefresh = () => {
        setRefreshing(true)
        fetchData()
    }

    if (loading && !data) {
        return (
            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100px">
                        <CircularProgress/>
                    </Box>
                </CardContent>
            </Card>
        )
    }

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
                <Typography variant="h5">Должники</Typography>
                <Tooltip title="Обновить">
                    <IconButton
                        onClick={handleRefresh}
                        disabled={refreshing}
                        size="small"
                    >
                        <RefreshIcon sx={{
                            transform: refreshing ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.3s ease-in-out'
                        }}/>
                    </IconButton>
                </Tooltip>

            </Box>

            {error && (
                <Alert severity="error" sx={{mb: 2}}>
                    {error}
                </Alert>
            )}

            {data && data.length > 0 && (
                <List dense sx={{maxHeight: 300, overflowY: 'auto'}}>
                    {data.map(item => (
                        <ListItem key={item.id} sx={{py: 0.5}} secondaryAction={
                            <Typography
                                color={item.balance >= 0 ? 'success.main' : 'error.main'}
                                fontWeight="medium"
                            >
                                {item.balance.toLocaleString('ru-RU', {
                                    style: 'currency',
                                    currency: 'RUB'
                                })}
                            </Typography>}>
                            <ListItemText
                                primary={`${item.firstName} ${item.lastName}`}
                            />
                        </ListItem>
                    ))}
                </List>
            )}

        </CardContent>
    </Card>)
}

export default ClientsWithDebtCard