import {ThemeProvider, createTheme, CssBaseline} from '@mui/material'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import Layout from './layouts/Layout'
import Home from './pages/Home'
import Clients from './pages/Clients'
import Login from './pages/Login'
import Register from './pages/Register'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import Expenses from './pages/Expenses'
import Services from './pages/Services'
import ServiceCalendar from './pages/ServiceCalendar'

const theme = createTheme({
    palette: {
        primary: {
            main: '#7D5A4B',
            light: '#A58B7E',
            dark: '#5C3F33',
            contrastText: '#F7E7C6',
        },
        secondary: {
            main: '#B18E6F',
            light: '#D3B89E',
            dark: '#8C6F5A',
            contrastText: '#3E2F29',
        },
        background: {
            default: '#F7E7C6',
            paper: '#EDE0C8',
        },
        text: {
            primary: '#3E2F29',
            secondary: '#6F5C4F',
            disabled: '#A59B8C',
        },
        mode: 'light',
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    border: '2px solid #5C3F33',
                    boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.15)',
                    '&:hover': {
                        boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.25)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    border: '1px solid #8C6F5A',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                },
            },
        },
        MuiInputBase: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    border: '1px solid #8C6F5A',
                    '&.Mui-focused': {
                        borderColor: '#7D5A4B',
                        boxShadow: '0 0 0 2px rgba(125, 90, 75, 0.2)',
                    }
                }
            }
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 16,
                    backgroundColor: '#F7E7C6',
                    border: '2px solid #5C3F33',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                    padding: '24px',
                    fontFamily: ['"EB Garamond"', 'serif'].join(','),
                },
            },
        }
    },
    typography: {
        fontFamily: [
            '"EB Garamond"',
            'serif',
        ].join(','),
    },
})

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline/>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login/>}/>
                    <Route path="/register" element={<Register/>}/>
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Home/>
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/clients"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Clients/>
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/expenses"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Expenses/>
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/services"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Services/>
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/calendar"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <ServiceCalendar/>
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<NotFound/>}/>
                </Routes>
            </Router>
        </ThemeProvider>
    )
}

export default App
