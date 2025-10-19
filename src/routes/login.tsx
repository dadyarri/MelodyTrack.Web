import {createFileRoute} from '@tanstack/react-router'
import {Box, Button, Container, Paper, TextField, Typography} from '@mui/material'
import {useForm} from "react-hook-form";
import * as yup from "yup";
import {yupResolver} from "@hookform/resolvers/yup";

export const Route = createFileRoute('/login')({
    component: RouteComponent,
})

function RouteComponent() {

    type Inputs = {
        email: string,
        password: string,
    }

    const schema = yup.object({
        email: yup.string().email('Почта не в валидном формате').required('Почта обязательна'),
        password: yup.string().required('Пароль обязателен')
    })

    const {register, handleSubmit, formState: {errors}} = useForm({
        resolver: yupResolver(schema),
    })
    const onSubmit = (values: Inputs) => {
        console.log(values)
    }

    return <Container maxWidth={"xs"}>
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
                <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                    <TextField margin={"normal"}
                               required
                               fullWidth
                               label={"Почта"}
                               autoComplete={"username"}
                               autoFocus
                               error={!!errors.email}
                               helperText={errors.email?.message}
                               {...register("email")}
                    />
                    <TextField margin={"normal"}
                               required
                               fullWidth
                               label={"Пароль"}
                               autoComplete={"current-password"}
                               type={"password"}
                               error={!!errors.password}
                               helperText={errors.password?.message}
                               {...register("password")}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{mt: 3, mb: 2}}
                    >
                        Войти
                    </Button>
                </Box>
            </Paper>
        </Box>
    </Container>
}
