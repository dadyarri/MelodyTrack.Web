import {
    Box,
    Container,
    AppBar,
    Toolbar,
    Link as MuiLink,
    Button,
    Typography,
    ListItem,
    ListItemButton,
    ListItemText,
    List,
    useTheme,
    useMediaQuery,
    IconButton,
    Drawer
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import {Link as RouterLink, useNavigate} from 'react-router-dom'
import {authService} from '../services/auth'
import React, {useState} from "react"

interface LayoutProps {
    children: React.ReactNode
}

const Layout = ({children}: LayoutProps) => {
    const navigate = useNavigate()
    const user = authService.getUser()

    const handleLogout = () => {
        authService.logout()
        navigate('/login')
    }

    const theme = useTheme();
    // Check if the screen is smaller than 'md' (typically tablets and phones)
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [drawerOpen, setDrawerOpen] = useState(false);

    const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
        if (
            event.type === 'keydown' &&
            ((event as React.KeyboardEvent).key === 'Tab' ||
                (event as React.KeyboardEvent).key === 'Shift')
        ) {
            return;
        }
        setDrawerOpen(open);
    };

    const navLinks = (
        <>
            <MuiLink component={RouterLink} to="/" color="primary" underline="none" sx={{fontSize: '1.3rem'}}>
                Главная
            </MuiLink>
            <MuiLink component={RouterLink} to="/calendar" color="primary" underline="none" sx={{fontSize: '1.3rem'}}>
                Календарь
            </MuiLink>
            <MuiLink component={RouterLink} to="/clients" color="primary" underline="none" sx={{fontSize: '1.3rem'}}>
                Клиенты
            </MuiLink>
            <MuiLink component={RouterLink} to="/expenses" color="primary" underline="none" sx={{fontSize: '1.3rem'}}>
                Расходы
            </MuiLink>
            <MuiLink component={RouterLink} to="/payments" color="primary" underline="none" sx={{fontSize: '1.3rem'}}>
                Платежи
            </MuiLink>
            <MuiLink component={RouterLink} to="/services" color="primary" underline="none" sx={{fontSize: '1.3rem'}}>
                Услуги
            </MuiLink>
        </>
    );

    const mobileNavLinks = (
        <Box
            sx={{width: 250}}
            role="presentation"
            onClick={toggleDrawer(false)}
            onKeyDown={toggleDrawer(false)}
        >
            <List>
                {[
                    {text: 'Главная', path: '/'},
                    {text: 'Календарь', path: '/calendar'},
                    {text: 'Клиенты', path: '/clients'},
                    {text: 'Расходы', path: '/expenses'},
                    {text: 'Платежи', path: '/payments'},
                    {text: 'Услуги', path: '/services'},
                ].map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton component={RouterLink} to={item.path}>
                            <ListItemText primary={item.text}/>
                        </ListItemButton>
                    </ListItem>
                ))}
                {user && (
                    <ListItem disablePadding>
                        <ListItemText
                            sx={{marginLeft: 2, marginTop: 1}}
                            primary={`Вы вошли как: ${user.firstName} ${user.lastName}`}
                        />
                    </ListItem>
                )}
                <ListItem disablePadding>
                    <ListItemButton onClick={handleLogout}>
                        <ListItemText primary="Выйти"/>
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );

    return (
        <Box sx={{minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
            <AppBar position="static" color="default" elevation={1}>
                <Toolbar>
                    <Container maxWidth="xl">
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                width: '100%',
                                alignItems: 'center', // Align items vertically in the middle
                            }}
                        >
                            {isMobile ? (
                                <IconButton
                                    color="inherit"
                                    aria-label="open drawer"
                                    edge="start"
                                    onClick={toggleDrawer(true)}
                                    sx={{mr: 2}}
                                >
                                    <MenuIcon/>
                                </IconButton>
                            ) : (
                                <Box sx={{display: 'flex', gap: 3}}>{navLinks}</Box>
                            )}

                            <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                                {!isMobile && ( // Show user info and logout button on larger screens
                                    <>
                                        <Typography variant="h6" component="div">
                                            {user?.firstName} {user?.lastName}
                                        </Typography>
                                        <Button color="inherit" onClick={handleLogout}>
                                            Выйти
                                        </Button>
                                    </>
                                )}
                            </Box>
                        </Box>
                    </Container>
                </Toolbar>

                <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
                    {mobileNavLinks}
                </Drawer>
            </AppBar>
            <Container maxWidth="xl" sx={{py: 4, flex: 1}}>
                {children}
            </Container>
        </Box>
    )
}

export default Layout 