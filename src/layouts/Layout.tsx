import { Box, Container, AppBar, Toolbar, Link as MuiLink, Button, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { authService } from '../services/auth'

interface LayoutProps {
  children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate()
  const user = authService.getUser()

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <MuiLink component={RouterLink} to="/" color="primary" underline="none">
                  {import.meta.env.VITE_APP_NAME}
                </MuiLink>
                <MuiLink component={RouterLink} to="/clients" color="primary" underline="none">
                  Клиенты
                </MuiLink>
                <MuiLink component={RouterLink} to="/expenses" color="primary" underline="none">
                  Расходы
                </MuiLink>
                <MuiLink component={RouterLink} to="/services" color="primary" underline="none">
                  Услуги
                </MuiLink>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2">
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Button color="inherit" onClick={handleLogout}>
                  Выйти
                </Button>
              </Box>
            </Box>
          </Container>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 4, flex: 1 }}>
        {children}
      </Container>
    </Box>
  )
}

export default Layout 