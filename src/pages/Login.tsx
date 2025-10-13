import {useState} from 'react'
import {useNavigate, Link as RouterLink} from 'react-router-dom'
import {
    Box,
    Button,
    Container,
    TextField,
    Typography,
    Link,
    Alert,
    Paper,
} from '@mui/material'
import {authService} from '../services/auth'

const Login = () => {
    const navigate = useNavigate()
    const [error, setError] = useState<string>('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError('')
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        const username = formData.get('username') as string
        const password = formData.get('password') as string

        try {
            await authService.login({username, password})
            navigate('/')
        } catch (err) {
            setError(`Ошибка входа`)
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Container maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Paper elevation={3} sx={{p: 4, width: '100%'}}>
                    <Typography component="h1" variant="h5" align="center" gutterBottom>
                        Войти в аккаунт
                    </Typography>
                    {error && (
                        <Alert severity="error" sx={{mb: 2}}>
                            {error}
                        </Alert>
                    )}
                    <Box component="form" onSubmit={handleSubmit} noValidate>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Логин"
                            name="username"
                            autoComplete="username"
                            autoFocus
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Пароль"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{mt: 3, mb: 2}}
                            disabled={loading}
                        >
                            Войти
                        </Button>
                        <Box sx={{textAlign: 'center'}}>
                            <Link component={RouterLink} to="/register" variant="body2">
                                {"Нет аккаунта? Зарегистрироваться"}
                            </Link>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        </Container>
    )
}

export default Login 