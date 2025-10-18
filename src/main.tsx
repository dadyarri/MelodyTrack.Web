import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {router} from './router';
import {RouterProvider} from "@tanstack/react-router";
import {TanStackRouterDevtools} from "@tanstack/react-router-devtools";
import {createTheme, CssBaseline, ThemeProvider} from "@mui/material";

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
        info: {
            main: '#6C8C9C', // A muted, desaturated blue-grey (like old parchment with blue ink)
            light: '#8FAAB8',
            dark: '#4F6A75',
            contrastText: '#F7E7C6',
        },
        success: {
            main: '#6D8F6C', // An earthy, muted green (like healthy herbs)
            light: '#91B090',
            dark: '#516B50',
            contrastText: '#F7E7C6',
        },
        warning: {
            main: '#B58D5D', // A muted, brownish-orange (like aged amber or a warning lamp)
            light: '#D4AF83',
            dark: '#8E6B47',
            contrastText: '#3E2F29', // Darker text for readability on lighter warning
        },
        error: {
            main: '#9C5858', // A deep, muted red/maroon (like dried blood or an old stained cloth)
            light: '#B87A7A',
            dark: '#754141',
            contrastText: '#F7E7C6',
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
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#F7E7C6',
                    borderBottom: '1px solid #D3B89E',
                    boxShadow: 'none',
                },
            },
        },
        MuiToolbar: {
            styleOverrides: {
                root: {
                    color: '#3E2F29',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    fontSize: '1.2rem',
                }
            }
        }
    },
    typography: {
        fontFamily: [
            '"EB Garamond"',
            'serif',
        ].join(','),
    },
})

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline/>
            <RouterProvider router={router}/>
            {process.env.NODE_ENV === "development" && (
                <TanStackRouterDevtools router={router} initialIsOpen={false}/>
            )}
        </ThemeProvider>
    </StrictMode>,
)
